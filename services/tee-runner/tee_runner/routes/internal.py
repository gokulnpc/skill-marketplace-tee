"""Internal session-scoped model proxy (sandbox handlers call this)."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel

from tee_runner.services.session_service import SessionService

router = APIRouter(prefix="/v1/internal", tags=["internal"])


class InternalChatRequest(BaseModel):
    messages: list[dict[str, Any]]
    tools: list[dict[str, Any]] | None = None


def get_session_service() -> SessionService:
    from tee_runner.main import session_service

    return session_service


@router.post("/sessions/{session_id}/chat/completions")
def internal_chat(
    session_id: str,
    body: InternalChatRequest,
    x_session_token: str | None = Header(default=None),
    service: SessionService = Depends(get_session_service),
) -> dict[str, Any]:
    if not service.verify_session_token(session_id, x_session_token):
        raise HTTPException(status_code=403, detail="Invalid session token")
    return service.proxy_chat(session_id, body.messages, body.tools)


@router.post("/chat/completions")
def internal_chat_legacy(
    body: InternalChatRequest,
    x_session_id: str | None = Header(default=None),
    x_session_token: str | None = Header(default=None),
    service: SessionService = Depends(get_session_service),
) -> dict[str, Any]:
    if not x_session_id:
        raise HTTPException(status_code=400, detail="X-Session-Id required")
    if not service.verify_session_token(x_session_id, x_session_token):
        raise HTTPException(status_code=403, detail="Invalid session token")
    return service.proxy_chat(x_session_id, body.messages, body.tools)
