from model_server.config import get_settings
from model_server.routes.chat import router as chat_router
from fastapi import FastAPI

settings = get_settings()

app = FastAPI(
    title="SkillVault Model Server",
    version="0.1.0",
    description="OpenAI-compatible local model server for TEE evaluation.",
)
app.include_router(chat_router)


@app.get("/health")
def health() -> dict[str, str]:
    return {
        "status": "ok",
        "mode": settings.model_mode,
        "model": settings.model_name,
        "model_hash": settings.model_hash,
    }


def run() -> None:
    import uvicorn

    uvicorn.run("model_server.main:app", host="0.0.0.0", port=8000, reload=True)


if __name__ == "__main__":
    run()
