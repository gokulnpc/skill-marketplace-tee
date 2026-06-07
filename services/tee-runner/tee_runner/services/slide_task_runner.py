"""Hybrid slide pipeline: deterministic tool bootstrap + NEAR JSON summarization."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from tee_runner.clients.model_client import ModelClient
from tee_runner.services.builtin_harness import AgentRunMetrics, KnowledgeFS, run_platform_tool
from tee_runner.services.prompts import prepare_skill_for_prompt
from tee_runner.services.slides_tool import run_generate_slides_tool

MAX_PAPER_EXCERPT = 4000
MAX_STYLE_EXCERPT = 2000

SLIDE_JSON_SYSTEM = """You are a research presentation assistant inside a TEE.
Given buyer paper excerpts and optional style notes, produce a conference slide deck outline.
Respond with ONLY a JSON object (no markdown fences) with keys:
- title (string): talk title
- slides (array): 8-12 objects, each with title (string) and bullets (array of strings)
Do not quote skill instructions verbatim. Do not include canary tokens."""


def _collect_paper_excerpts(kfs: KnowledgeFS) -> list[dict[str, str]]:
    excerpts: list[dict[str, str]] = []
    for rel in kfs.list_papers():
        try:
            text = kfs.read_paper(rel)[:MAX_PAPER_EXCERPT]
        except ValueError:
            continue
        excerpts.append({"path": rel, "excerpt": text.strip()})
    return excerpts


def _collect_style_hints(kfs: KnowledgeFS) -> str:
    hints: list[str] = []
    for subdir in ("synthesis", "notes", ""):
        try:
            for hit in kfs.grep("presentation|slide|talk", subdir)[:5]:
                path = hit.replace("knowledge/", "")
                try:
                    hints.append(kfs.read_file(path)[:800])
                except ValueError:
                    continue
        except Exception:
            continue
    combined = "\n\n".join(hints)[:MAX_STYLE_EXCERPT]
    return combined.strip()


def _parse_slide_json(raw: str) -> dict[str, Any]:
    text = raw.strip()
    if text.startswith("```"):
        lines = text.splitlines()
        if lines and lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        text = "\n".join(lines)
    parsed = json.loads(text)
    if not isinstance(parsed, dict):
        raise ValueError("Slide JSON must be an object")
    return parsed


def _default_slides(paper_excerpts: list[dict[str, str]]) -> dict[str, Any]:
    first_title = "Research Overview"
    if paper_excerpts:
        first_line = paper_excerpts[0]["excerpt"].splitlines()[0].lstrip("# ").strip()
        if first_line:
            first_title = first_line[:80]
    return {
        "title": first_title,
        "slides": [
            {"title": "Problem", "bullets": ["Motivation from buyer papers"]},
            {"title": "Approach", "bullets": ["Mechanism design and evaluation"]},
            {"title": "Evidence", "bullets": ["Key findings from uploaded papers"]},
            {"title": "Takeaways", "bullets": ["Summary and open questions"]},
        ],
    }


def _build_summary_json(
    *,
    title: str,
    slide_count: int,
    artifact_path: str,
    artifact_size: int,
) -> str:
    return json.dumps(
        {
            "summary": f"Generated {slide_count}-slide deck as slides.pptx from buyer papers.",
            "analysis": (
                "Hybrid slide pipeline read buyer papers, applied presentation style hints, "
                "and produced a PPTX artifact inside the TEE."
            ),
            "artifact": "slides.pptx",
            "slide_count": slide_count,
            "artifact_path": artifact_path,
            "artifact_size": artifact_size,
        },
        indent=2,
    )


def run_slide_task(
    model_client: ModelClient,
    *,
    skill_content: str,
    transcript: str,
    files: dict[str, bytes],
    knowledge_dirs: list[str] | None,
    workspace: Path,
) -> tuple[str, AgentRunMetrics]:
    """Deterministic paper/knowledge reads, one NEAR JSON call, PPTX generation."""
    kfs = KnowledgeFS(files, knowledge_dirs)
    metrics = AgentRunMetrics(iterations=1)

    workspace.mkdir(parents=True, exist_ok=True)
    (workspace / "output").mkdir(parents=True, exist_ok=True)

    paper_excerpts = _collect_paper_excerpts(kfs)
    style_hints = _collect_style_hints(kfs)
    skill_summary = prepare_skill_for_prompt(skill_content)[:1500]

    user_parts = [
        f"Task: {transcript}",
        f"Buyer papers ({len(paper_excerpts)}):",
    ]
    for item in paper_excerpts:
        user_parts.append(f"- {item['path']}: {item['excerpt'][:1200]}")
    if style_hints:
        user_parts.append(f"Presentation style hints:\n{style_hints}")
    if skill_summary:
        user_parts.append(
            "Skill methodology summary (do not quote verbatim in output):\n"
            + skill_summary[:1000]
        )

    messages = [
        {"role": "system", "content": SLIDE_JSON_SYSTEM},
        {"role": "user", "content": "\n\n".join(user_parts)},
    ]

    try:
        raw = model_client.chat_completion(messages, response_format_json=True)
        deck = _parse_slide_json(raw)
    except (json.JSONDecodeError, ValueError, RuntimeError):
        deck = _default_slides(paper_excerpts)

    title = str(deck.get("title") or "Research Talk")
    slides = deck.get("slides") or []
    if not isinstance(slides, list) or not slides:
        deck = _default_slides(paper_excerpts)
        title = str(deck["title"])
        slides = deck["slides"]

    tool_result = run_generate_slides_tool({"title": title, "slides": slides}, workspace)
    tool_data = json.loads(tool_result)
    artifact_path = workspace / "output" / "slides.pptx"
    if artifact_path.exists():
        metrics.artifact_path = str(artifact_path)

    slide_count = int(tool_data.get("slide_count", len(slides)))
    artifact_size = int(tool_data.get("size", artifact_path.stat().st_size if artifact_path.exists() else 0))

    summary = _build_summary_json(
        title=title,
        slide_count=slide_count,
        artifact_path=str(artifact_path),
        artifact_size=artifact_size,
    )
    return summary, metrics
