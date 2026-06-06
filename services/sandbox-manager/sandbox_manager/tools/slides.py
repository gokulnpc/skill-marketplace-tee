"""PPTX generation inside sandbox workspace."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any


def generate_slides_pptx(output_path: Path, title: str, slides: list[dict[str, Any]]) -> dict[str, Any]:
    from pptx import Presentation
    from pptx.util import Pt

    output_path.parent.mkdir(parents=True, exist_ok=True)
    prs = Presentation()
    title_slide = prs.slides.add_slide(prs.slide_layouts[0])
    title_slide.shapes.title.text = title
    if len(title_slide.placeholders) > 1:
        title_slide.placeholders[1].text = "SkillVault TEE · Ari Juels demo"

    for item in slides[:12]:
        slide = prs.slides.add_slide(prs.slide_layouts[1])
        slide.shapes.title.text = str(item.get("title", "Slide"))
        body = slide.shapes.placeholders[1].text_frame
        body.clear()
        bullets = item.get("bullets") or []
        if isinstance(bullets, str):
            bullets = [bullets]
        for idx, bullet in enumerate(bullets[:6]):
            p = body.paragraphs[0] if idx == 0 else body.add_paragraph()
            p.text = str(bullet)
            p.font.size = Pt(18)

    prs.save(str(output_path))
    return {"path": str(output_path), "size": output_path.stat().st_size, "slide_count": len(slides)}


def run_generate_slides_tool(args: dict[str, Any], workspace: Path) -> str:
    title = str(args.get("title", "Research Talk"))
    slides = args.get("slides") or [
        {"title": "Overview", "bullets": ["Key themes from buyer papers"]},
        {"title": "Findings", "bullets": ["Evidence-backed insights"]},
    ]
    output = workspace / "output" / "slides.pptx"
    return json.dumps(generate_slides_pptx(output, title, slides))
