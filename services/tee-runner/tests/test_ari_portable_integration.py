"""Integration test with ari-portable-skill.zip when present."""

import json
from pathlib import Path

import pytest

from tee_runner.crypto.envelope import encrypt_envelope
from tee_runner.services.package_loader import extract_zip_to_map, parse_skill_package

REPO_ROOT = Path(__file__).resolve().parents[3]
ARI_ZIP = REPO_ROOT / "ari-portable-skill.zip"
ARI_DATASET = REPO_ROOT / "skills" / "sample-datasets" / "ari-juels" / "demo_eval_dataset.json"


@pytest.mark.skipif(not ARI_ZIP.exists(), reason="ari-portable-skill.zip not in repo")
def test_ari_portable_skill_zip_parses():
    zip_bytes = ARI_ZIP.read_bytes()
    pkg = parse_skill_package(zip_bytes)
    files = extract_zip_to_map(zip_bytes)
    assert pkg.skill_md.strip()
    assert "skill/SKILL.md" in files
    assert any(k.startswith("skill/knowledge/") for k in files)
    assert pkg.manifest.get("evaluation_type") == "agent"
    assert pkg.harness_runtime == "builtin"


@pytest.mark.skipif(not ARI_ZIP.exists(), reason="ari-portable-skill.zip not in repo")
def test_ari_portable_skill_zip_eval(agent_client):
    zip_bytes = ARI_ZIP.read_bytes()
    dataset_path = ARI_DATASET if ARI_DATASET.exists() else None
    if dataset_path:
        dataset = dataset_path.read_text()
    else:
        dataset = json.dumps(
            {
                "transcripts": [
                    {
                        "id": "research_1",
                        "content": "Evaluate this idea: validators sell ordering guarantees privately.",
                    }
                ],
                "ground_truth": {
                    "research_1": {
                        "must_not_leak": ["SKILLVAULT_CANARY"],
                        "must_include": ["ordering"],
                    }
                },
                "eval_config": {"evaluation_type": "agent"},
            }
        )

    create = agent_client.post("/v1/sessions", json={"skill_id": "ari-juels", "threshold": 0.3})
    assert create.status_code == 201
    session_id = create.json()["session_id"]
    pub = agent_client.get(f"/v1/sessions/{session_id}/attestation").json()["ephemeral_public_key"]

    skill_env = encrypt_envelope(pub, zip_bytes)
    dataset_env = encrypt_envelope(pub, dataset.encode())

    assert agent_client.post(f"/v1/sessions/{session_id}/inputs/skill", json=skill_env).status_code == 200
    assert agent_client.post(f"/v1/sessions/{session_id}/inputs/dataset", json=dataset_env).status_code == 200

    infer = agent_client.post(f"/v1/sessions/{session_id}/inference", json={})
    assert infer.status_code == 200
    infer_body = infer.json()
    assert infer_body["results"]
    with_skill = infer_body["results"][0]["with_skill_output"]
    assert "SKILLVAULT_CANARY" not in with_skill
    assert len(with_skill.strip()) > 50
    metrics = infer_body.get("agent_metrics") or {}
    assert metrics.get("tool_calls", 0) >= 1
    assert metrics.get("evaluation_type") == "agent"

    ev = agent_client.post(f"/v1/sessions/{session_id}/evaluate", json={})
    assert ev.status_code == 200
    assert ev.json()["passed"] is True

    fin = agent_client.post(f"/v1/sessions/{session_id}/finalize", json={})
    assert fin.status_code == 200
    receipt = fin.json()
    assert receipt["skill_hash"].startswith("sha256:")
    assert receipt.get("harness_runtime") == "builtin"

    verify = agent_client.get(f"/v1/sessions/{session_id}/receipt/verify")
    assert verify.status_code == 200
    assert verify.json()["valid"] is True
