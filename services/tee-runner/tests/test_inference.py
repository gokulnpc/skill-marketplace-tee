import json

import pytest
from fastapi.testclient import TestClient

from tee_runner.config import Settings
from tee_runner.crypto.envelope import encrypt_envelope
from tee_runner.main import app
from tee_runner.services.inference_service import InferenceService
from tee_runner.services.session_service import SessionService
from tee_runner.session.store import SessionStore
from tee_runner.tee.mock import MockTeeAdapter


class InProcessModelClient:
    def __init__(self, model_app) -> None:
        self._client = TestClient(model_app)
        self._model = "llama-3.1-8b-instruct"

    def chat_completion(
        self,
        messages: list[dict[str, str]],
        temperature: float = 0.0,
    ) -> str:
        response = self._client.post(
            "/v1/chat/completions",
            json={"model": self._model, "messages": messages, "temperature": temperature},
        )
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"]


@pytest.fixture
def inference_client(model_app) -> TestClient:
    settings = Settings(runner_mode="mock")
    service = SessionService(
        store=SessionStore(),
        tee=MockTeeAdapter(settings),
        settings=settings,
        inference_service=InferenceService(InProcessModelClient(model_app)),
    )

    from tee_runner.routes.sessions import get_session_service

    app.dependency_overrides[get_session_service] = lambda: service
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


@pytest.fixture
def model_app():
    from model_server.main import app as model_application

    return model_application


def test_inference_runs_baseline_and_with_skill(inference_client: TestClient) -> None:
    create = inference_client.post(
        "/v1/sessions",
        json={"skill_id": "discreet-meeting-notes", "threshold": 0.85},
    )
    session_id = create.json()["session_id"]
    public_key = inference_client.get(f"/v1/sessions/{session_id}/attestation").json()[
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

    inference_client.post(
        f"/v1/sessions/{session_id}/inputs/skill",
        json=encrypt_envelope(public_key, skill_content.encode("utf-8")),
    )
    inference_client.post(
        f"/v1/sessions/{session_id}/inputs/dataset",
        json=encrypt_envelope(public_key, dataset.encode("utf-8")),
    )

    response = inference_client.post(f"/v1/sessions/{session_id}/inference")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "inference_complete"
    assert body["sample_count"] == 1

    result = body["results"][0]
    assert result["transcript_id"] == "meeting_001"
    assert "Sarah" in result["baseline_output"] or "Participants" in result["baseline_output"]
    assert "redacted_notes" in result["with_skill_output"]
    assert "Acme Bank" not in result["with_skill_output"]

    cached = inference_client.post(f"/v1/sessions/{session_id}/inference")
    assert cached.status_code == 200
    assert cached.json()["sample_count"] == 1
