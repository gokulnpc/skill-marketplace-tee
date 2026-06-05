from datetime import datetime

from fastapi import FastAPI

from tee_runner.clients.model_client import ModelClient
from tee_runner.config import get_settings
from tee_runner.routes.sessions import router as sessions_router
from tee_runner.services.evaluation_service import EvaluationService
from tee_runner.services.inference_service import InferenceService
from tee_runner.services.session_service import SessionService
from tee_runner.session.store import SessionStore
from tee_runner.tee.factory import create_tee_adapter

settings = get_settings()
store = SessionStore()
tee_adapter = create_tee_adapter(settings)
model_client = ModelClient(base_url=settings.model_server_url, model=settings.model_name)
inference_service = InferenceService(model_client=model_client)
evaluation_service = EvaluationService()
session_service = SessionService(
    store=store,
    tee=tee_adapter,
    settings=settings,
    inference_service=inference_service,
    evaluation_service=evaluation_service,
)

app = FastAPI(
    title="SkillVault TEE Runner",
    version="0.1.0",
    description="Evaluation runner with attestation, encrypted inputs, and receipt signing.",
)
app.include_router(sessions_router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "mode": settings.runner_mode}


@app.get("/v1/signing-public-key")
def signing_public_key() -> dict[str, str]:
    return {"public_key_pem": session_service.get_signing_public_key_pem()}


def run() -> None:
    import uvicorn

    uvicorn.run("tee_runner.main:app", host="0.0.0.0", port=8080, reload=True)


if __name__ == "__main__":
    run()
