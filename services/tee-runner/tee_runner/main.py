from datetime import datetime

from fastapi import FastAPI

from tee_runner.clients.model_client import ModelClient
from tee_runner.clients.near_client import fetch_near_attestation
from tee_runner.clients.sandbox_client import SandboxClient
from tee_runner.config import get_settings
from tee_runner.routes.internal import router as internal_router
from tee_runner.routes.sessions import router as sessions_router
from tee_runner.services.agent_evaluation_service import AgentEvaluationService
from tee_runner.services.evaluation_service import EvaluationService
from tee_runner.services.session_service import SessionService
from tee_runner.session.store import SessionStore
from tee_runner.tee.factory import create_tee_adapter

settings = get_settings()
store = SessionStore()
tee_adapter = create_tee_adapter(settings)
model_client = ModelClient(base_url=settings.model_server_url, model=settings.model_name)

sandbox_client = None
if settings.sandbox_manager_url:
    sandbox_client = SandboxClient(settings.sandbox_manager_url)

inference_service = AgentEvaluationService(
    model_client=model_client,
    sandbox_client=sandbox_client,
)
evaluation_service = EvaluationService()

# Cache NEAR attestation on startup when using near_private inference
_near_attestation: dict | None = None
if settings.inference_provider == "near_private":
    _near_attestation = fetch_near_attestation(settings.near_completions_base)

session_service = SessionService(
    store=store,
    tee=tee_adapter,
    settings=settings,
    inference_service=inference_service,
    evaluation_service=evaluation_service,
    model_client=model_client,
)

app = FastAPI(
    title="SkillVault TEE Runner",
    version="0.2.0",
    description="Evaluation runner with agent harness, sandbox, attestation, and receipt signing.",
)
app.include_router(sessions_router)
app.include_router(internal_router)


@app.get("/health")
def health() -> dict[str, str]:
    return {
        "status": "ok",
        "mode": settings.runner_mode,
        "inference_provider": settings.inference_provider,
    }


@app.get("/v1/signing-public-key")
def signing_public_key() -> dict[str, str]:
    return {"public_key_pem": session_service.get_signing_public_key_pem()}


def run() -> None:
    import uvicorn

    uvicorn.run("tee_runner.main:app", host="0.0.0.0", port=8080, reload=True)


if __name__ == "__main__":
    run()
