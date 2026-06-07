"""NEAR AI private inference backend."""

from __future__ import annotations

import hashlib
import json
import os
import sys
import time
from typing import Any

import httpx

DEBUG_LOG_PATH = os.environ.get(
    "SKILLVAULT_DEBUG_LOG",
    "/Users/gokuleshwarannarayanan/Documents/Repositories/Hackathons/skill-mp/.cursor/debug-563348.log",
)


def _debug_log(message: str, data: dict[str, Any], hypothesis_id: str) -> None:
    # #region agent log
    payload = {
        "sessionId": "563348",
        "timestamp": int(time.time() * 1000),
        "location": "near_private_engine.py",
        "message": message,
        "data": data,
        "hypothesisId": hypothesis_id,
    }
    print(f"[near-debug] {json.dumps(payload)}", file=sys.stderr, flush=True)
    try:
        with open(DEBUG_LOG_PATH, "a", encoding="utf-8") as fh:
            fh.write(json.dumps(payload) + "\n")
    except OSError:
        pass
    # #endregion


def near_api_root(base_url: str) -> str:
    """Normalize base URL to end with /v1 (NEAR direct completions format)."""
    base = base_url.rstrip("/")
    if base.endswith("/v1"):
        return base
    return f"{base}/v1"


def _headers() -> dict[str, str]:
    api_key = os.environ.get("NEAR_API_KEY", "")
    if not api_key:
        raise RuntimeError("NEAR_API_KEY is required for near_private mode")
    return {"Authorization": f"Bearer {api_key}"}


def near_chat_completion(
    *,
    base_url: str,
    model: str,
    messages: list[dict[str, Any]],
    temperature: float = 0.0,
    tools: list[dict[str, Any]] | None = None,
    timeout: float = 120.0,
) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
    }
    if tools:
        payload["tools"] = tools
        payload["tool_choice"] = "auto"
    else:
        payload["response_format"] = {"type": "json_object"}

    api_root = near_api_root(base_url)
    _debug_log(
        "NEAR chat request",
        {
            "api_root": api_root,
            "model": model,
            "message_count": len(messages),
            "has_tools": bool(tools),
            "tool_count": len(tools or []),
        },
        "H1",
    )

    with httpx.Client(base_url=api_root, timeout=timeout) as client:
        response = client.post("/chat/completions", headers=_headers(), json=payload)
        if response.is_error:
            _debug_log(
                "NEAR chat failed",
                {
                    "status": response.status_code,
                    "model": model,
                    "body_preview": response.text[:500],
                },
                "H1",
            )
        response.raise_for_status()
        return response.json()


def fetch_near_attestation(base_url: str, timeout: float = 30.0) -> dict[str, Any]:
    url = f"{near_api_root(base_url)}/attestation/report"
    with httpx.Client(timeout=timeout) as client:
        response = client.get(url, params={"include_tls_fingerprint": "true"})
        if response.status_code == 404:
            return {"status": "unavailable"}
        response.raise_for_status()
        return response.json()


def attestation_ref(report: dict[str, Any]) -> str:
    raw = str(report).encode()
    return f"sha256:{hashlib.sha256(raw).hexdigest()}"
