import json
import time
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
        # #region agent log
        from tee_runner.debug_log import agent_log

        started = time.monotonic()
        agent_log(
            "model_client.py:_post",
            "model request start",
            {"path": path, "timeout_s": self._timeout, "message_count": len(payload.get("messages", []))},
            "A",
        )
        # #endregion
        try:
            if self._client is not None:
                response = self._client.post(path, json=payload)
            else:
                with httpx.Client(base_url=self._base_url, timeout=self._timeout) as client:
                    response = client.post(path, json=payload)
        except httpx.TimeoutException as exc:
            elapsed_ms = int((time.monotonic() - started) * 1000)
            # #region agent log
            agent_log(
                "model_client.py:_post",
                "model request timeout",
                {"path": path, "elapsed_ms": elapsed_ms, "timeout_s": self._timeout, "error": str(exc)},
                "A",
            )
            # #endregion
            raise RuntimeError(
                f"Model server request timed out after {elapsed_ms}ms (limit {self._timeout}s)"
            ) from exc
        except httpx.HTTPError as exc:
            elapsed_ms = int((time.monotonic() - started) * 1000)
            # #region agent log
            agent_log(
                "model_client.py:_post",
                "model request http error",
                {"path": path, "elapsed_ms": elapsed_ms, "error": type(exc).__name__, "detail": str(exc)},
                "B",
            )
            # #endregion
            raise RuntimeError(f"Model server unreachable: {exc}") from exc

        elapsed_ms = int((time.monotonic() - started) * 1000)
        # #region agent log
        agent_log(
            "model_client.py:_post",
            "model request complete",
            {"path": path, "elapsed_ms": elapsed_ms, "status": response.status_code},
            "A",
        )
        # #endregion
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
