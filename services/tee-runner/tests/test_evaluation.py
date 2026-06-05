import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from tee_runner.config import Settings
from tee_runner.crypto.envelope import encrypt_envelope
from tee_runner.main import app
from tee_runner.services.evaluation_service import EvaluationService
from tee_runner.services.inference_service import InferenceService
from tee_runner.services.session_service import SessionService
from tee_runner.session.store import SessionStore
from tee_runner.tee.mock import MockTeeAdapter

SKILL_PATH = Path(__file__).resolve().parents[3] / "skills/discreet-meeting-notes/SKILL.md"
DATASET_PATH = (
    Path(__file__).resolve().parents[3]
    / "skills/sample-datasets/discreet-meeting-notes/buyer_eval_dataset.json"
)


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
def eval_client(model_app) -> TestClient:
    settings = Settings(runner_mode="mock")
    service = SessionService(
        store=SessionStore(),
        tee=MockTeeAdapter(settings),
        settings=settings,
        inference_service=InferenceService(InProcessModelClient(model_app)),
        evaluation_service=EvaluationService(),
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


def test_full_evaluate_and_auto_finalize(eval_client: TestClient) -> None:
    skill = SKILL_PATH.read_bytes()
    full_dataset = json.loads(DATASET_PATH.read_text(encoding="utf-8"))
    dataset = json.dumps(
        {
            "transcripts": [full_dataset["transcripts"][0]],
            "ground_truth": {"meeting_001": full_dataset["ground_truth"]["meeting_001"]},
            "eval_config": full_dataset["eval_config"],
        }
    ).encode("utf-8")

    create = eval_client.post(
        "/v1/sessions",
        json={"skill_id": "discreet-meeting-notes", "threshold": 0.85},
    )
    session_id = create.json()["session_id"]
    public_key = eval_client.get(f"/v1/sessions/{session_id}/attestation").json()[
        "ephemeral_public_key"
    ]

    eval_client.post(
        f"/v1/sessions/{session_id}/inputs/skill",
        json=encrypt_envelope(public_key, skill),
    )
    eval_client.post(
        f"/v1/sessions/{session_id}/inputs/dataset",
        json=encrypt_envelope(public_key, dataset),
    )

    inference = eval_client.post(f"/v1/sessions/{session_id}/inference")
    assert inference.status_code == 200
    assert inference.json()["sample_count"] == 1

    evaluation = eval_client.post(f"/v1/sessions/{session_id}/evaluate")
    assert evaluation.status_code == 200
    body = evaluation.json()
    assert body["status"] == "evaluated"
    assert body["skill_score"] >= body["baseline_score"]
    assert body["passed"] is True
    assert len(body["samples"]) == 1
    assert all(sample["approved_output"] for sample in body["samples"])

    receipt = eval_client.post(f"/v1/sessions/{session_id}/finalize", json={})
    assert receipt.status_code == 200
    receipt_body = receipt.json()
    assert receipt_body["passed"] is True
    assert receipt_body["skill_score"] == body["skill_score"]
    assert receipt_body["skill_hash"].startswith("sha256:")
