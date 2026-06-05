from fastapi import APIRouter, HTTPException

from model_server.config import get_settings
from model_server.mock_engine import generate_mock_completion
from model_server.ollama_engine import ollama_chat_completion
from model_server.schemas import ChatCompletionRequest

router = APIRouter(prefix="/v1", tags=["openai"])


@router.post("/chat/completions")
def chat_completions(request: ChatCompletionRequest) -> dict:
    settings = get_settings()
    messages = [m.model_dump() for m in request.messages]

    if settings.model_mode == "mock":
        return generate_mock_completion(messages, request.model)

    if settings.model_mode == "ollama":
        return ollama_chat_completion(
            base_url=settings.ollama_base_url,
            model=request.model,
            messages=messages,
            temperature=request.temperature,
            timeout=settings.ollama_timeout,
        )

    raise HTTPException(
        status_code=501,
        detail=f"Model mode '{settings.model_mode}' is not implemented. Use mock or ollama.",
    )


@router.get("/models")
def list_models() -> dict:
    settings = get_settings()
    return {
        "object": "list",
        "data": [
            {
                "id": settings.model_name,
                "object": "model",
                "owned_by": "skillvault-tee",
            }
        ],
    }
