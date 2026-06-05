from fastapi import APIRouter, HTTPException

from model_server.config import get_settings
from model_server.mock_engine import generate_mock_completion
from model_server.schemas import ChatCompletionRequest

router = APIRouter(prefix="/v1", tags=["openai"])


@router.post("/chat/completions")
def chat_completions(request: ChatCompletionRequest) -> dict:
    settings = get_settings()
    messages = [m.model_dump() for m in request.messages]

    if settings.model_mode == "mock":
        return generate_mock_completion(messages, request.model)

    raise HTTPException(
        status_code=501,
        detail=f"Model mode '{settings.model_mode}' is not implemented yet",
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
