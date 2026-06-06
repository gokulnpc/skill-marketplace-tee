"""Built-in agent harness with knowledge file tools."""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from tee_runner.clients.model_client import ModelClient
from tee_runner.services.prompts import (
    build_agent_baseline_messages,
    build_agent_with_skill_messages,
    build_baseline_messages,
    build_with_skill_messages,
)
from tee_runner.services.slides_tool import run_generate_slides_tool


KNOWLEDGE_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "read_file",
            "description": "Read a file under the skill knowledge base (skill/knowledge/...).",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {
                        "type": "string",
                        "description": "Relative path under knowledge/, e.g. synthesis/evidence_map.md",
                    }
                },
                "required": ["path"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_dir",
            "description": "List files in a knowledge subdirectory.",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "Subdir under knowledge/, default ''"},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "grep_knowledge",
            "description": "Search for a pattern in knowledge files.",
            "parameters": {
                "type": "object",
                "properties": {
                    "pattern": {"type": "string"},
                    "path": {"type": "string", "description": "Optional subdir under knowledge/"},
                },
                "required": ["pattern"],
            },
        },
    },
]

PAPER_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "list_papers",
            "description": "List buyer-uploaded research papers under dataset/papers/.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "read_paper",
            "description": "Read a buyer paper file under dataset/papers/.",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "Relative path under dataset/papers/"},
                },
                "required": ["path"],
            },
        },
    },
]

SLIDE_TOOL = {
    "type": "function",
    "function": {
        "name": "generate_slides_pptx",
        "description": "Generate a PPTX slide deck in workspace/output/slides.pptx.",
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


def agent_platform_tools(*, include_papers: bool, include_slides: bool) -> list[dict[str, Any]]:
    tools = list(KNOWLEDGE_TOOLS)
    if include_papers:
        tools.extend(PAPER_TOOLS)
    if include_slides:
        tools.append(SLIDE_TOOL)
    return tools


@dataclass
class AgentRunMetrics:
    tool_calls: int = 0
    iterations: int = 0
    artifact_path: str | None = None


class KnowledgeFS:
    def __init__(self, files: dict[str, bytes], knowledge_dirs: list[str] | None = None) -> None:
        self._files = files
        self._knowledge_prefixes = [f"skill/{d.rstrip('/')}/" for d in (knowledge_dirs or ["knowledge"])]
        self._papers_prefix = "dataset/papers/"

    def _allowed(self, rel: str) -> str | None:
        rel = rel.lstrip("/").replace("\\", "/")
        for prefix in self._knowledge_prefixes:
            full = f"{prefix}{rel}"
            if full in self._files:
                return full
        return None

    def read_file(self, path: str) -> str:
        full = self._allowed(path)
        if not full:
            raise ValueError(f"Path not found or not allowed: {path}")
        return self._files[full].decode("utf-8", errors="replace")

    def list_dir(self, path: str = "") -> list[str]:
        path = path.strip("/")
        results: list[str] = []
        for prefix in self._knowledge_prefixes:
            base = f"{prefix}{path}/" if path else prefix
            for key in self._files:
                if key.startswith(base) and key != base:
                    rel = key[len(prefix) :]
                    if path:
                        rel = rel[len(path) + 1 :] if rel.startswith(path + "/") else rel
                    part = rel.split("/")[0]
                    if part and part not in results:
                        results.append(part)
        return sorted(results)

    def grep(self, pattern: str, path: str = "") -> list[str]:
        hits: list[str] = []
        regex = re.compile(pattern, re.IGNORECASE)
        path = path.strip("/")
        for prefix in self._knowledge_prefixes:
            base = f"{prefix}{path}/" if path else prefix
            for key, data in self._files.items():
                if not key.startswith(base):
                    continue
                text = data.decode("utf-8", errors="replace")
                if regex.search(text):
                    hits.append(key.replace("skill/", ""))
        return hits[:20]

    def list_papers(self) -> list[str]:
        return sorted(
            key[len(self._papers_prefix) :]
            for key in self._files
            if key.startswith(self._papers_prefix) and key != self._papers_prefix
        )

    def read_paper(self, path: str) -> str:
        rel = path.lstrip("/").replace("\\", "/")
        full = f"{self._papers_prefix}{rel}"
        if full not in self._files:
            raise ValueError(f"Paper not found: {path}")
        data = self._files[full]
        if full.lower().endswith(".pdf"):
            return data[:4000].decode("latin-1", errors="replace")
        return data.decode("utf-8", errors="replace")


def run_platform_tool(
    kfs: KnowledgeFS,
    name: str,
    args: dict[str, Any],
    *,
    workspace: Path | None = None,
) -> str:
    if name == "read_file":
        return kfs.read_file(str(args.get("path", "")))
    if name == "list_dir":
        return json.dumps(kfs.list_dir(str(args.get("path", ""))))
    if name == "grep_knowledge":
        return json.dumps(kfs.grep(str(args.get("pattern", "")), str(args.get("path", ""))))
    if name == "list_papers":
        return json.dumps(kfs.list_papers())
    if name == "read_paper":
        return kfs.read_paper(str(args.get("path", "")))[:8000]
    if name == "generate_slides_pptx":
        if workspace is None:
            raise ValueError("Workspace not configured for slide generation")
        return run_generate_slides_tool(args, workspace)
    raise ValueError(f"Unknown tool: {name}")


def run_builtin_agent(
    model_client: ModelClient,
    *,
    skill_content: str,
    transcript: str,
    files: dict[str, bytes],
    knowledge_dirs: list[str] | None,
    with_skill: bool,
    evaluation_type: str = "redaction",
    max_iterations: int = 12,
    workspace: Path | None = None,
    slide_task: bool = False,
) -> tuple[str, AgentRunMetrics]:
    kfs = KnowledgeFS(files, knowledge_dirs)
    metrics = AgentRunMetrics()
    is_agent = evaluation_type == "agent"
    has_papers = any(k.startswith("dataset/papers/") for k in files)

    if with_skill:
        if is_agent:
            prompt_messages = build_agent_with_skill_messages(skill_content, transcript)
        else:
            prompt_messages = build_with_skill_messages(skill_content, transcript)
        messages: list[dict[str, Any]] = [
            {"role": "system", "content": prompt_messages[0]["content"]},
            {"role": "user", "content": prompt_messages[1]["content"]},
        ]
        tools = (
            agent_platform_tools(include_papers=has_papers, include_slides=slide_task)
            if is_agent
            else None
        )
    else:
        if is_agent:
            messages = build_agent_baseline_messages(transcript)
        else:
            messages = build_baseline_messages(transcript)
        tools = None

    if workspace is not None:
        (workspace / "output").mkdir(parents=True, exist_ok=True)

    for _ in range(max_iterations):
        metrics.iterations += 1
        response = model_client.chat_completion_with_tools(messages, tools=tools)
        msg = response.get("message", {})
        messages.append(msg)
        tool_calls = msg.get("tool_calls") or []
        if not tool_calls:
            return str(msg.get("content", "")), metrics
        for call in tool_calls:
            metrics.tool_calls += 1
            fn = call.get("function", {})
            name = fn.get("name", "")
            try:
                args = json.loads(fn.get("arguments") or "{}")
            except json.JSONDecodeError:
                args = {}
            try:
                result = run_platform_tool(kfs, name, args, workspace=workspace)
                if name == "generate_slides_pptx" and workspace is not None:
                    metrics.artifact_path = str(workspace / "output" / "slides.pptx")
            except Exception as exc:
                result = f"Error: {exc}"
            messages.append(
                {
                    "role": "tool",
                    "tool_call_id": call.get("id", name),
                    "content": result[:8000],
                }
            )
    last_content = ""
    for msg in reversed(messages):
        if msg.get("role") == "assistant" and msg.get("content"):
            last_content = str(msg["content"])
            break
    return last_content, metrics


def extract_files_from_zip_bytes(zip_bytes: bytes) -> dict[str, bytes]:
    from tee_runner.services.package_loader import extract_zip_to_map

    if zip_bytes[:2] == b"PK":
        return extract_zip_to_map(zip_bytes)
    return {"skill/SKILL.md": zip_bytes}


def merge_papers_into_files(files: dict[str, bytes], papers_zip: bytes) -> dict[str, bytes]:
    from tee_runner.services.papers_zip import extract_papers_zip

    merged = dict(files)
    for rel, data in extract_papers_zip(papers_zip).items():
        merged[f"dataset/papers/{rel}"] = data
    return merged
