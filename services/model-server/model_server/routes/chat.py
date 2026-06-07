from fastapi import APIRouter, HTTPException
import httpx

from model_server.config import get_settings
from model_server.mock_engine import generate_mock_completion
from model_server.near_private_engine import near_chat_completion
from model_server.ollama_engine import ollama_chat_completion
from model_server.schemas import ChatCompletionRequest

router = APIRouter(prefix="/v1", tags=["openai"])


@router.post("/chat/completions")
def chat_completions(request: ChatCompletionRequest) -> dict:
    settings = get_settings()
    messages = [m.model_dump(exclude_none=True) for m in request.messages]

    if settings.model_mode == "mock":
        tools = [t.model_dump() for t in request.tools] if request.tools else None
        return generate_mock_completion(messages, request.model, tools=tools)

    if settings.model_mode == "ollama":
        json_mode = request.response_format is not None and request.response_format.type == "json_object"
        return ollama_chat_completion(
            base_url=settings.ollama_base_url,
            model=request.model,
            messages=messages,
            temperature=request.temperature,
            timeout=settings.ollama_timeout,
            json_mode=json_mode,
        )

    if settings.model_mode == "near_private":
        tools = [t.model_dump() for t in request.tools] if request.tools else None
        try:
            return near_chat_completion(
                base_url=settings.near_completions_base,
                model=settings.near_model_slug or request.model,
                messages=messages,
                temperature=request.temperature,
                tools=tools,
                timeout=settings.near_timeout,
            )
        except RuntimeError as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc
        except httpx.HTTPStatusError as exc:
            body = exc.response.text[:500]
            raise HTTPException(
                status_code=502,
                detail=f"NEAR inference failed ({exc.response.status_code}): {body}",
            ) from exc

    raise HTTPException(
        status_code=501,
        detail=f"Model mode '{settings.model_mode}' is not implemented. Use mock, ollama, or near_private.",
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
