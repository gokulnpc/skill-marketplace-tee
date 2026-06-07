import json
from typing import Any

import httpx


class ModelClient:
    def __init__(
        self,
        base_url: str,
        model: str,
        timeout: float = 120.0,
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
        *,
        response_format_json: bool = True,
    ) -> str:
        payload: dict[str, Any] = {
            "model": self._model,
            "messages": messages,
            "temperature": temperature,
        }
        if response_format_json:
            payload["response_format"] = {"type": "json_object"}
        data = self._post("/v1/chat/completions", payload)
        return data["choices"][0]["message"]["content"]

    def chat_completion_with_tools(
        self,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]] | None = None,
        temperature: float = 0.0,
    ) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "model": self._model,
            "messages": messages,
            "temperature": temperature,
        }
        if tools:
            payload["tools"] = tools
        else:
            payload["response_format"] = {"type": "json_object"}
        data = self._post("/v1/chat/completions", payload)
        return {"message": data["choices"][0]["message"], "usage": data.get("usage")}

    def health(self) -> dict[str, Any]:
        if self._client is not None:
            response = self._client.get("/health")
        else:
            with httpx.Client(base_url=self._base_url, timeout=self._timeout) as client:
                response = client.get("/health")
        response.raise_for_status()
        return response.json()

    def _post(self, path: str, payload: dict[str, Any]) -> dict[str, Any]:
        if self._client is not None:
            response = self._client.post(path, json=payload)
        else:
            with httpx.Client(base_url=self._base_url, timeout=self._timeout) as client:
                response = client.post(path, json=payload)
        if response.is_error:
            detail = response.text
            try:
                body = response.json()
                if isinstance(body.get("detail"), str):
                    detail = body["detail"]
            except (json.JSONDecodeError, TypeError, AttributeError):
                pass
            raise RuntimeError(f"Model server {response.status_code}: {detail}") from None
        return response.json()
