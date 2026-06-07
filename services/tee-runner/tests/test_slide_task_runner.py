"""Tests for hybrid slide task runner."""

import io
import json
import zipfile
from pathlib import Path

import pytest

from tee_runner.services.builtin_harness import extract_files_from_zip_bytes, merge_papers_into_files
from tee_runner.services.package_loader import parse_skill_package, resolve_knowledge_dirs
from tee_runner.services.papers_zip import SLIDE_TASK_PROMPT
from tee_runner.services.slide_task_runner import run_slide_task

REPO_ROOT = Path(__file__).resolve().parents[3]
ARI_ZIP = REPO_ROOT / "apps" / "api" / "seed" / "ari-portable-skill.zip"


def _make_papers_zip() -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr("paper1.md", "# Private Ordering\nMEV and ordering markets.")
    return buf.getvalue()


class JsonSlideModelClient:
    def chat_completion(self, messages, temperature=0.0, **kwargs) -> str:
        return json.dumps(
            {
                "title": "Ordering Markets Talk",
                "slides": [
                    {"title": "Problem", "bullets": ["MEV concerns in slide deck"]},
                    {"title": "Approach", "bullets": ["Mechanism design"]},
                ],
            }
        )


class ProseOnlyModelClient:
    """Simulates NEAR returning prose instead of JSON."""

    def chat_completion(self, messages, temperature=0.0, **kwargs) -> str:
        return "Here is a slide deck about private ordering markets and slides."


@pytest.mark.skipif(not ARI_ZIP.exists(), reason="ari-portable-skill.zip not in repo")
def test_run_slide_task_produces_pptx(tmp_path):
    zip_bytes = ARI_ZIP.read_bytes()
    pkg = parse_skill_package(zip_bytes)
    files = extract_files_from_zip_bytes(zip_bytes)
    files = merge_papers_into_files(files, _make_papers_zip())
    knowledge_dirs = resolve_knowledge_dirs(pkg.manifest, files)

    output, metrics = run_slide_task(
        JsonSlideModelClient(),  # type: ignore[arg-type]
        skill_content=pkg.skill_md,
        transcript=SLIDE_TASK_PROMPT,
        files=files,
        knowledge_dirs=knowledge_dirs,
        workspace=tmp_path,
    )

    parsed = json.loads(output)
    assert "slide" in parsed["summary"].lower()
    assert metrics.artifact_path is not None
    assert Path(metrics.artifact_path).exists()
    assert Path(metrics.artifact_path).read_bytes()[:2] == b"PK"


@pytest.mark.skipif(not ARI_ZIP.exists(), reason="ari-portable-skill.zip not in repo")
def test_run_slide_task_fallback_when_model_returns_prose(tmp_path):
    zip_bytes = ARI_ZIP.read_bytes()
    pkg = parse_skill_package(zip_bytes)
    files = merge_papers_into_files(extract_files_from_zip_bytes(zip_bytes), _make_papers_zip())

    output, metrics = run_slide_task(
        ProseOnlyModelClient(),  # type: ignore[arg-type]
        skill_content=pkg.skill_md,
        transcript=SLIDE_TASK_PROMPT,
        files=files,
        knowledge_dirs=resolve_knowledge_dirs(pkg.manifest, files),
        workspace=tmp_path,
    )

    assert metrics.artifact_path is not None
    assert Path(metrics.artifact_path).exists()
    assert json.loads(output)["artifact"] == "slides.pptx"
