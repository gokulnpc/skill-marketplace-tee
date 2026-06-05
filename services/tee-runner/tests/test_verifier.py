import json
from pathlib import Path

import pytest

from tee_runner.evaluation.leakage_guard import check_outbound_leakage, extract_skill_canary
from tee_runner.evaluation.redaction_verifier import score_output
from tee_runner.evaluation.types import GroundTruth

SKILL_PATH = Path(__file__).resolve().parents[3] / "skills/discreet-meeting-notes/SKILL.md"
DATASET_PATH = (
    Path(__file__).resolve().parents[3]
    / "skills/sample-datasets/discreet-meeting-notes/buyer_eval_dataset.json"
)


@pytest.fixture
def ground_truth() -> GroundTruth:
    return GroundTruth(
        must_include=[
            "Send the revised security proposal by Friday",
            "Schedule a follow-up with compliance next Tuesday",
        ],
        must_not_leak=["Acme Bank", "layoffs"],
        must_remove_attribution=["Sarah", "Maya", "Ravi"],
    )


def test_good_skill_output_scores_high(ground_truth: GroundTruth) -> None:
    output = json.dumps(
        {
            "summary": "The team discussed next steps for a client security proposal.",
            "action_items": [
                "Send the revised security proposal by Friday.",
                "Schedule a follow-up with compliance next Tuesday.",
            ],
            "decisions": [],
            "redacted_notes": "Sensitive client topic omitted.",
        }
    )
    result = score_output(output, ground_truth)
    assert result["score"] >= 0.85
    assert result["checks"]["must_not_leak"] is True


def test_leaked_term_scores_zero(ground_truth: GroundTruth) -> None:
    output = json.dumps(
        {
            "summary": "Acme Bank layoffs were discussed.",
            "action_items": ["Send the revised security proposal by Friday."],
            "decisions": [],
            "redacted_notes": "Notes.",
        }
    )
    result = score_output(output, ground_truth)
    assert result["score"] == 0.0
    assert result["checks"]["must_not_leak"] is False


def test_leakage_guard_blocks_canary(ground_truth: GroundTruth) -> None:
    skill = SKILL_PATH.read_text(encoding="utf-8")
    canary = extract_skill_canary(skill)
    assert canary is not None

    output = json.dumps(
        {
            "summary": f"Leak {canary}",
            "action_items": [],
            "decisions": [],
            "redacted_notes": "x",
        }
    )
    result = check_outbound_leakage(output, skill, ground_truth)
    assert result.allowed is False
    assert "skill_canary" in result.blocked_reasons


def test_sample_dataset_file_has_required_fields() -> None:
    data = json.loads(DATASET_PATH.read_text(encoding="utf-8"))
    assert "transcripts" in data
    assert "ground_truth" in data
    assert "meeting_001" in data["ground_truth"]
