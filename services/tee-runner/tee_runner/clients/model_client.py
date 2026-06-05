import json
from typing import Any

import httpx


class ModelClient:
    def __init__(
        self,
        base_url: str,
        model: str,
        timeout: float = 60.0,
        client: httpx.Client | None = None,
    ) -> None:
        self._base_url = base_url.rstrip("/")
        self._model = model
        self._timeout = timeout
        self._client = client

    def chat_completion(
        self,
        messages: list[dict[str, str]],
        temperature: float = 0.0,
    ) -> str:
        payload = {
            "model": self._model,
            "messages": messages,
            "temperature": temperature,
        }
        if self._client is not None:
            response = self._client.post("/v1/chat/completions", json=payload)
        else:
            with httpx.Client(base_url=self._base_url, timeout=self._timeout) as client:
                response = client.post("/v1/chat/completions", json=payload)
        response.raise_for_status()
        data = response.json()
        return data["choices"][0]["message"]["content"]

    def health(self) -> dict[str, Any]:
        if self._client is not None:
            response = self._client.get("/health")
        else:
            with httpx.Client(base_url=self._base_url, timeout=self._timeout) as client:
                response = client.get("/health")
        response.raise_for_status()
        return response.json()
