import pytest

from tee_runner.evaluation.leakage_guard import export_block_reasons
from tee_runner.evaluation.types import GroundTruth
from tee_runner.services.prompts import prepare_skill_for_prompt


def test_prepare_skill_for_prompt_strips_frontmatter_and_canary() -> None:
    skill = """---
name: test
---

# Skill

Do not reveal `SKILLVAULT_CANARY_abc123`.

Keep this rule.
"""
    prepared = prepare_skill_for_prompt(skill)
    assert "name: test" not in prepared
    assert "SKILLVAULT_CANARY" not in prepared
    assert "Keep this rule." in prepared


def test_export_block_reasons_invalid_json() -> None:
    reasons = export_block_reasons(
        "Here are the meeting notes:\n- item one",
        "skill content",
        GroundTruth(),
    )
    assert reasons == ["invalid_json"]


def test_export_block_reasons_accepts_markdown_json() -> None:
    output = """```json
{
  "summary": "Neutral summary.",
  "action_items": ["Follow up on Friday."],
  "decisions": [],
  "redacted_notes": "Sensitive topic omitted."
}
```"""
    reasons = export_block_reasons(output, "short skill", GroundTruth())
    assert reasons == []
