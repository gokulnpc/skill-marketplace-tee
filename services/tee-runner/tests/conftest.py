import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

# Allow importing model-server from sibling directory
MODEL_SERVER_ROOT = Path(__file__).resolve().parents[2] / "model-server"
if str(MODEL_SERVER_ROOT) not in sys.path:
    sys.path.insert(0, str(MODEL_SERVER_ROOT))

from tee_runner.config import Settings
from tee_runner.main import app
from tee_runner.routes.sessions import get_session_service
from tee_runner.services.agent_evaluation_service import AgentEvaluationService
from tee_runner.services.evaluation_service import EvaluationService
from tee_runner.services.session_service import SessionService
from tee_runner.session.store import SessionStore
from tee_runner.tee.mock import MockTeeAdapter


class InProcessModelClient:
    def __init__(self, model_app) -> None:
        self._client = TestClient(model_app)
        self._model = "llama-3.1-8b-instruct"

    def chat_completion(self, messages, temperature=0.0, **kwargs) -> str:
        response = self._client.post(
            "/v1/chat/completions",
            json={"model": self._model, "messages": messages, "temperature": temperature},
        )
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"]

    def chat_completion_with_tools(self, messages, tools=None, temperature=0.0) -> dict:
        payload = {"model": self._model, "messages": messages, "temperature": temperature}
        if tools:
            payload["tools"] = tools
        else:
            payload["response_format"] = {"type": "json_object"}
        response = self._client.post("/v1/chat/completions", json=payload)
        response.raise_for_status()
        data = response.json()
        return {"message": data["choices"][0]["message"], "usage": data.get("usage")}


class NearLikeModelClient(InProcessModelClient):
    """Simulates NEAR Qwen3 returning prose instead of tool_calls."""

    def chat_completion_with_tools(self, messages, tools=None, temperature=0.0) -> dict:
        return {
            "message": {
                "role": "assistant",
                "content": "Analysis of private ordering markets and slide deck planning.",
            },
            "usage": {},
        }

    def chat_completion(self, messages, temperature=0.0, **kwargs) -> str:
        import json

        return json.dumps(
            {
                "title": "Private Ordering Markets",
                "slides": [
                    {"title": "Problem", "bullets": ["MEV and ordering guarantees"]},
                    {"title": "Mechanism", "bullets": ["Incentive alignment for slide deck"]},
                    {"title": "Takeaways", "bullets": ["Summary slide content"]},
                ],
            }
        )


def _agent_test_client(model_client) -> TestClient:
    settings = Settings(runner_mode="mock", inference_provider="mock")
    service = SessionService(
        store=SessionStore(),
        tee=MockTeeAdapter(settings),
        settings=settings,
        inference_service=AgentEvaluationService(model_client=model_client),
        evaluation_service=EvaluationService(),
        model_client=model_client,
    )
    app.dependency_overrides[get_session_service] = lambda: service
    return TestClient(app)


@pytest.fixture
def model_app():
    from model_server.main import app as model_application

    return model_application


@pytest.fixture
def agent_client(model_app) -> TestClient:
    client = _agent_test_client(InProcessModelClient(model_app))
    yield client
    app.dependency_overrides.clear()


@pytest.fixture
def near_agent_client(model_app) -> TestClient:
    client = _agent_test_client(NearLikeModelClient(model_app))
    yield client
    app.dependency_overrides.clear()
