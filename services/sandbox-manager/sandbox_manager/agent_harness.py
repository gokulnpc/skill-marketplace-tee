"""Agent harness for sandbox-manager — mirrors tee-runner builtin agent loop."""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

from sandbox_manager.session_manager import SessionSandbox
from sandbox_manager.tools.slides import run_generate_slides_tool


def _call_model_proxy(
    session: SessionSandbox, messages: list[dict[str, Any]], tools: list | None = None
) -> dict:
    import httpx
    import os

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


def _skill_root(session: SessionSandbox) -> Path:
    nested = session.root / "skill" / "skill"
    if nested.exists():
        return nested
    return session.root / "skill"


def _list_files_under(root: Path, prefix: Path) -> dict[str, bytes]:
    files: dict[str, bytes] = {}
    if not prefix.exists():
        return files
    for path in prefix.rglob("*"):
        if path.is_file():
            rel = path.relative_to(root).as_posix()
            files[rel] = path.read_bytes()
    return files


class SandboxKnowledgeFS:
    def __init__(self, session: SessionSandbox) -> None:
        root = session.root
        self._skill_root = _skill_root(session)
        self._files: dict[str, bytes] = {}
        for path in self._skill_root.rglob("*"):
            if path.is_file():
                rel = path.relative_to(self._skill_root).as_posix()
                self._files[f"skill/{rel}"] = path.read_bytes()
        papers_dir = root / "dataset" / "papers"
        if papers_dir.exists():
            for path in papers_dir.rglob("*"):
                if path.is_file():
                    rel = path.relative_to(papers_dir).as_posix()
                    self._files[f"dataset/papers/{rel}"] = path.read_bytes()

    def read_file(self, path: str) -> str:
        full = f"skill/knowledge/{path.lstrip('/')}"
        if full not in self._files:
            raise ValueError(f"Path not found: {path}")
        return self._files[full].decode("utf-8", errors="replace")

    def list_dir(self, path: str = "") -> list[str]:
        base = f"skill/knowledge/{path.strip('/')}/" if path else "skill/knowledge/"
        names: set[str] = set()
        for key in self._files:
            if key.startswith(base) and key != base:
                rest = key[len(base) :]
                names.add(rest.split("/")[0])
        return sorted(names)

    def grep(self, pattern: str, path: str = "") -> list[str]:
        regex = re.compile(pattern, re.IGNORECASE)
        base = f"skill/knowledge/{path.strip('/')}/" if path else "skill/knowledge/"
        hits: list[str] = []
        for key, data in self._files.items():
            if not key.startswith(base):
                continue
            if regex.search(data.decode("utf-8", errors="replace")):
                hits.append(key.replace("skill/", ""))
        return hits[:20]

    def list_papers(self) -> list[str]:
        return sorted(
            k.replace("dataset/papers/", "")
            for k in self._files
            if k.startswith("dataset/papers/")
        )

    def read_paper(self, path: str) -> str:
        full = f"dataset/papers/{path.lstrip('/')}"
        if full not in self._files:
            raise ValueError(f"Paper not found: {path}")
        data = self._files[full]
        if full.lower().endswith(".pdf"):
            return data[:4000].decode("latin-1", errors="replace")
        return data.decode("utf-8", errors="replace")


def _agent_tools(*, include_papers: bool, include_slides: bool) -> list[dict[str, Any]]:
    tools = [
        {
            "type": "function",
            "function": {
                "name": "read_file",
                "description": "Read skill knowledge file",
                "parameters": {
                    "type": "object",
                    "properties": {"path": {"type": "string"}},
                    "required": ["path"],
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "list_dir",
                "description": "List knowledge subdirectory",
                "parameters": {"type": "object", "properties": {"path": {"type": "string"}}},
            },
        },
        {
            "type": "function",
            "function": {
                "name": "grep_knowledge",
                "description": "Search knowledge files",
                "parameters": {
                    "type": "object",
                    "properties": {"pattern": {"type": "string"}, "path": {"type": "string"}},
                    "required": ["pattern"],
                },
            },
        },
    ]
    if include_papers:
        tools.extend(
            [
                {
                    "type": "function",
                    "function": {"name": "list_papers", "description": "List buyer papers", "parameters": {"type": "object", "properties": {}}},
                },
                {
                    "type": "function",
                    "function": {
                        "name": "read_paper",
                        "description": "Read buyer paper",
                        "parameters": {
                            "type": "object",
                            "properties": {"path": {"type": "string"}},
                            "required": ["path"],
                        },
                    },
                },
            ]
        )
    if include_slides:
        tools.append(
            {
                "type": "function",
                "function": {
                    "name": "generate_slides_pptx",
                    "description": "Write slides.pptx to workspace/output/",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "title": {"type": "string"},
                            "slides": {
                                "type": "array",
                                "items": {
                                    "type": "object",
                                    "properties": {
                                        "title": {"type": "string"},
                                        "bullets": {"type": "array", "items": {"type": "string"}},
                                    },
                                },
                            },
                        },
                        "required": ["title", "slides"],
                    },
                },
            }
        )
    return tools


def run_agent_harness(
    session: SessionSandbox,
    *,
    transcript: str,
    with_skill: bool,
    slide_task: bool = False,
    max_iterations: int = 16,
) -> str:
    root = _skill_root(session)
    skill_md = (root / "SKILL.md").read_text() if with_skill and (root / "SKILL.md").exists() else ""
    workspace = session.root / "workspace"
    (workspace / "output").mkdir(parents=True, exist_ok=True)
    kfs = SandboxKnowledgeFS(session)
    has_papers = (session.root / "dataset" / "papers").exists()

    system = (
        f"You are an autonomous research agent inside a TEE.\n\nSkill:\n{skill_md}\n\n"
        if with_skill
        else "You are a research assistant without private skill access.\n"
    )
    if slide_task:
        system += "Use tools to read papers and knowledge, then call generate_slides_pptx.\n"

    messages: list[dict[str, Any]] = [
        {"role": "system", "content": system},
        {"role": "user", "content": transcript},
    ]
    tools = _agent_tools(include_papers=has_papers, include_slides=slide_task) if with_skill or slide_task else None

    for _ in range(max_iterations):
        result = _call_model_proxy(session, messages, tools=tools)
        msg = result.get("message", result)
        messages.append(msg)
        tool_calls = msg.get("tool_calls") or []
        if not tool_calls:
            return str(msg.get("content", ""))
        for call in tool_calls:
            fn = call.get("function", {})
            name = fn.get("name", "")
            try:
                args = json.loads(fn.get("arguments") or "{}")
            except json.JSONDecodeError:
                args = {}
            try:
                if name == "read_file":
                    out = kfs.read_file(str(args.get("path", "")))
                elif name == "list_dir":
                    out = json.dumps(kfs.list_dir(str(args.get("path", ""))))
                elif name == "grep_knowledge":
                    out = json.dumps(kfs.grep(str(args.get("pattern", "")), str(args.get("path", ""))))
                elif name == "list_papers":
                    out = json.dumps(kfs.list_papers())
                elif name == "read_paper":
                    out = kfs.read_paper(str(args.get("path", "")))[:8000]
                elif name == "generate_slides_pptx":
                    out = run_generate_slides_tool(args, workspace)
                else:
                    out = f"Unknown tool: {name}"
            except Exception as exc:
                out = f"Error: {exc}"
            messages.append(
                {"role": "tool", "tool_call_id": call.get("id", name), "content": out[:8000]}
            )
    return str(messages[-1].get("content", ""))
