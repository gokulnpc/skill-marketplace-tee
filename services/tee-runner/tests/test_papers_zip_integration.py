"""Integration test: papers zip → agent harness → PPTX artifact."""

import io
import json
import zipfile
from pathlib import Path

import pytest

from tee_runner.crypto.envelope import encrypt_envelope
from tee_runner.services.dataset_parser import parse_evaluation_dataset
from tee_runner.services.papers_zip import extract_papers_zip, is_papers_zip

REPO_ROOT = Path(__file__).resolve().parents[3]
ARI_ZIP = REPO_ROOT / "ari-portable-skill.zip"


def _make_papers_zip() -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr(
            "paper1.md",
            "# Private Ordering Markets\nValidators selling ordering guarantees raise MEV concerns.",
        )
        zf.writestr(
            "paper2.md",
            "# Mechanism Design\nIncentive alignment for slide deck generation demo.",
        )
    return buf.getvalue()


def test_papers_zip_parser():
    raw = _make_papers_zip()
    assert is_papers_zip(raw)
    files = extract_papers_zip(raw)
    assert len(files) == 2
    dataset = parse_evaluation_dataset(raw)
    assert dataset.evaluation_type == "agent"
    assert dataset.transcripts[0].id == "slides_from_papers"


@pytest.mark.skipif(not ARI_ZIP.exists(), reason="ari-portable-skill.zip not in repo")
def test_ari_papers_zip_slide_eval(agent_client):
    zip_bytes = ARI_ZIP.read_bytes()
    papers_zip = _make_papers_zip()

    create = agent_client.post("/v1/sessions", json={"skill_id": "ari-juels", "threshold": 0.3})
    assert create.status_code == 201
    session_id = create.json()["session_id"]
    pub = agent_client.get(f"/v1/sessions/{session_id}/attestation").json()["ephemeral_public_key"]

    skill_env = encrypt_envelope(pub, zip_bytes)
    papers_env = encrypt_envelope(pub, papers_zip)

    assert agent_client.post(f"/v1/sessions/{session_id}/inputs/skill", json=skill_env).status_code == 200
    assert agent_client.post(f"/v1/sessions/{session_id}/inputs/dataset", json=papers_env).status_code == 200

    infer = agent_client.post(f"/v1/sessions/{session_id}/inference", json={})
    assert infer.status_code == 200
    infer_body = infer.json()
    metrics = infer_body.get("agent_metrics") or {}
    assert metrics.get("slide_task") is True
    assert metrics.get("tool_calls", 0) >= 1

    ev = agent_client.post(f"/v1/sessions/{session_id}/evaluate", json={})
    assert ev.status_code == 200
    assert ev.json()["passed"] is True
    assert ev.json().get("artifacts", {}).get("slides.pptx")

    artifact = agent_client.get(f"/v1/sessions/{session_id}/artifacts/slides.pptx")
    assert artifact.status_code == 200
    assert artifact.content[:2] == b"PK"

    fin = agent_client.post(f"/v1/sessions/{session_id}/finalize", json={})
    assert fin.status_code == 200
