"""Integration test: agent eval with zip package and builtin harness."""

import json
import io
import zipfile

from tee_runner.crypto.envelope import encrypt_envelope


def _zip_with_knowledge() -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr("skill/SKILL.md", "# Skill\nRedact secrets.\n")
        zf.writestr(
            "skill/manifest.json",
            json.dumps(
                {
                    "manifest_version": "skillvault-1",
                    "evaluation_type": "redaction",
                    "knowledge_dirs": ["knowledge"],
                    "harness": {"runtime": "builtin", "max_iterations": 3},
                }
            ),
        )
        zf.writestr("skill/knowledge/notes.txt", "Sensitive: Project Falcon budget $2M")
    return buf.getvalue()


def test_agent_eval_session_with_zip(agent_client):
    create = agent_client.post("/v1/sessions", json={"skill_id": "test-skill", "threshold": 0.5})
    assert create.status_code == 201
    session_id = create.json()["session_id"]

    pub = agent_client.get(f"/v1/sessions/{session_id}/attestation").json()["ephemeral_public_key"]

    skill_env = encrypt_envelope(pub, _zip_with_knowledge())
    dataset = json.dumps(
        {
            "transcripts": [{"id": "t1", "content": "Alice: Project Falcon is over budget."}],
            "ground_truth": {
                "t1": {"must_not_leak": ["Falcon", "Alice"], "must_include": ["budget"]}
            },
        }
    )
    dataset_env = encrypt_envelope(pub, dataset.encode())

    assert agent_client.post(f"/v1/sessions/{session_id}/inputs/skill", json=skill_env).status_code == 200
    assert agent_client.post(f"/v1/sessions/{session_id}/inputs/dataset", json=dataset_env).status_code == 200

    infer = agent_client.post(f"/v1/sessions/{session_id}/inference", json={})
    assert infer.status_code == 200
    assert infer.json()["sample_count"] == 1

    ev = agent_client.post(f"/v1/sessions/{session_id}/evaluate", json={})
    assert ev.status_code == 200

    fin = agent_client.post(f"/v1/sessions/{session_id}/finalize", json={})
    assert fin.status_code == 200
    receipt = fin.json()
    assert receipt["skill_hash"].startswith("sha256:")
