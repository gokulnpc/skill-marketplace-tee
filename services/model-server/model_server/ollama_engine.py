import httpx


def ollama_chat_completion(
    *,
    base_url: str,
    model: str,
    messages: list[dict[str, str]],
    temperature: float,
    timeout: float = 300.0,
) -> dict:
    payload = {
        "model": model,
        "messages": messages,
        "stream": False,
        "options": {"temperature": temperature},
    }
    with httpx.Client(base_url=base_url.rstrip("/"), timeout=timeout) as client:
        response = client.post("/api/chat", json=payload)
        response.raise_for_status()
        data = response.json()

    content = data.get("message", {}).get("content", "")
    return {
        "id": f"chatcmpl-{data.get('created_at', 'ollama')}",
        "object": "chat.completion",
        "model": model,
        "choices": [
            {
                "index": 0,
                "message": {"role": "assistant", "content": content},
                "finish_reason": "stop",
            }
        ],
        "usage": {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0},
    }


def wait_for_ollama(base_url: str, timeout: float = 120.0) -> None:
    import time

    deadline = time.time() + timeout
    last_error: Exception | None = None
    while time.time() < deadline:
        try:
            with httpx.Client(base_url=base_url.rstrip("/"), timeout=5.0) as client:
                response = client.get("/api/tags")
                response.raise_for_status()
                return
        except Exception as exc:  # noqa: BLE001
            last_error = exc
            time.sleep(2)
    raise RuntimeError(f"Ollama not ready at {base_url}: {last_error}")


def pull_model(base_url: str, model: str, timeout: float = 1800.0) -> None:
    payload = {"name": model, "stream": False}
    with httpx.Client(base_url=base_url.rstrip("/"), timeout=timeout) as client:
        response = client.post("/api/pull", json=payload)
        response.raise_for_status()
