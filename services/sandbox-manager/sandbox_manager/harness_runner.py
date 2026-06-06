"""Execute seller harness or builtin fallback inside sandbox workspace."""

from __future__ import annotations

import importlib.util
import json
import os
import sys
from pathlib import Path
from typing import Any

import httpx

from sandbox_manager.session_manager import SessionSandbox


def _skill_root(session: SessionSandbox) -> Path:
    nested = session.root / "skill" / "skill"
    if nested.exists():
        return nested
    return session.root / "skill"


def _load_skill_md(root: Path) -> str:
    for candidate in (root / "SKILL.md", root / "skill" / "SKILL.md"):
        if candidate.exists():
            return candidate.read_text()
    return ""


def _call_model_proxy(session: SessionSandbox, messages: list[dict[str, Any]], tools: list | None = None) -> dict:
    url = session.model_proxy_url or os.environ.get("MODEL_PROXY_URL", "http://localhost:8080")
    headers = {"X-Session-Id": session.session_id}
    if session.session_token:
        headers["X-Session-Token"] = session.session_token
    payload: dict[str, Any] = {"messages": messages}
    if tools:
        payload["tools"] = tools
    with httpx.Client(timeout=120.0) as client:
        response = client.post(f"{url.rstrip('/')}/v1/internal/chat/completions", json=payload, headers=headers)
        response.raise_for_status()
        return response.json()


def run_builtin(session: SessionSandbox, with_skill: bool) -> str:
    root = _skill_root(session)
    skill_md = _load_skill_md(root) if with_skill else ""
    dataset_files = list((session.root / "dataset").glob("*.json"))
    transcript = ""
    if dataset_files:
        data = json.loads(dataset_files[0].read_text())
        transcript = data.get("content", "")

    messages: list[dict[str, Any]] = [
        {
            "role": "system",
            "content": skill_md if with_skill else "Summarize the transcript as JSON with summary, action_items, decisions, redacted_notes.",
        },
        {"role": "user", "content": transcript},
    ]
    result = _call_model_proxy(session, messages)
    return str(result.get("content", ""))


def run_python_handler(session: SessionSandbox, with_skill: bool) -> str:
    root = _skill_root(session)
    harness = session.manifest.get("harness", {})
    entry = harness.get("entry", "harness/handler.py")
    entry_path = root / entry
    if not entry_path.exists():
        return run_builtin(session, with_skill)

    spec = importlib.util.spec_from_file_location("seller_handler", entry_path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Cannot load handler: {entry_path}")
    mod = importlib.util.module_from_spec(spec)
    sys.path.insert(0, str(root))
    spec.loader.exec_module(mod)

    dataset_files = list((session.root / "dataset").glob("*.json"))
    sample = json.loads(dataset_files[0].read_text()) if dataset_files else {}

    ctx = {
        "skill_dir": str(root),
        "dataset_path": str(dataset_files[0]) if dataset_files else "",
        "workspace": str(session.root / "workspace"),
        "with_skill": with_skill,
        "sample": sample,
        "model_proxy": session.model_proxy_url,
    }

    if hasattr(mod, "run_eval"):
        result = mod.run_eval(ctx)
        if isinstance(result, dict):
            return json.dumps(result.get("output", result))
        return str(result)
    raise RuntimeError("Handler must define run_eval(ctx)")


def run_harness(session: SessionSandbox, with_skill: bool) -> str:
    runtime = session.manifest.get("harness", {}).get("runtime", "builtin")
    if runtime == "python":
        return run_python_handler(session, with_skill)
    return run_builtin(session, with_skill)
