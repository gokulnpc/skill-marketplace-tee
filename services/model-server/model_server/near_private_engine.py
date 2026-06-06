"""NEAR AI private inference backend."""

from __future__ import annotations

import hashlib
import os
from typing import Any

import httpx


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
    else:
        payload["response_format"] = {"type": "json_object"}

    with httpx.Client(base_url=base_url.rstrip("/"), timeout=timeout) as client:
        response = client.post("/v1/chat/completions", headers=_headers(), json=payload)
        response.raise_for_status()
        return response.json()


def fetch_near_attestation(base_url: str, timeout: float = 30.0) -> dict[str, Any]:
    url = base_url.rstrip("/") + "/v1/attestation/report"
    with httpx.Client(timeout=timeout) as client:
        response = client.get(url, params={"include_tls_fingerprint": "true"})
        if response.status_code == 404:
            return {"status": "unavailable"}
        response.raise_for_status()
        return response.json()


def attestation_ref(report: dict[str, Any]) -> str:
    raw = str(report).encode()
    return f"sha256:{hashlib.sha256(raw).hexdigest()}"
