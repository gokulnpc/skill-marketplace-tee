import json

from fastapi.testclient import TestClient


def test_inference_runs_baseline_and_with_skill(agent_client: TestClient) -> None:
    create = agent_client.post(
        "/v1/sessions",
        json={"skill_id": "discreet-meeting-notes", "threshold": 0.85},
    )
    session_id = create.json()["session_id"]
    public_key = agent_client.get(f"/v1/sessions/{session_id}/attestation").json()[
        "ephemeral_public_key"
    ]

    skill_content = "Discreet Meeting Notes redaction skill. Redact sensitive topics."
    dataset = json.dumps(
        {
            "transcripts": [
                {
                    "id": "meeting_001",
                    "content": (
                        "Sarah: The client is Acme Bank.\n"
                        "Ravi: I will send the revised security proposal by Friday."
                    ),
                }
            ]
        }
    )

    from tee_runner.crypto.envelope import encrypt_envelope

    agent_client.post(
        f"/v1/sessions/{session_id}/inputs/skill",
        json=encrypt_envelope(public_key, skill_content.encode("utf-8")),
    )
    agent_client.post(
        f"/v1/sessions/{session_id}/inputs/dataset",
        json=encrypt_envelope(public_key, dataset.encode("utf-8")),
    )

    response = agent_client.post(f"/v1/sessions/{session_id}/inference")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "inference_complete"
    assert body["sample_count"] == 1

    result = body["results"][0]
    assert result["transcript_id"] == "meeting_001"
    assert "Sarah" in result["baseline_output"] or "Participants" in result["baseline_output"]
    assert "redacted_notes" in result["with_skill_output"]
    assert "Acme Bank" not in result["with_skill_output"]

    cached = agent_client.post(f"/v1/sessions/{session_id}/inference")
    assert cached.status_code == 200
    assert cached.json()["sample_count"] == 1
