"""Slide-task scoring and leakage guard with artifacts."""

import json

from tee_runner.evaluation.agent_verifier import score_slide_task_output
from tee_runner.evaluation.leakage_guard import export_block_reasons, sanitize_for_export
from tee_runner.evaluation.types import GroundTruth, ScoreWeights


def test_score_slide_task_with_artifact():
    ground_truth = GroundTruth(must_include=["slide"], must_not_leak=["SKILLVAULT_CANARY"])
    weights = ScoreWeights(must_not_leak=0.35, must_include=0.25, attribution_removal=0.1, utility=0.3)
    output = json.dumps({"summary": "Slide deck generated", "artifact": "slides.pptx"})
    result = score_slide_task_output(
        output,
        ground_truth,
        weights,
        artifacts_meta={"slides.pptx": {"size": 4096}},
    )
    assert result["score"] >= 0.7
    assert result["checks"]["artifact_present"] is True


def test_leakage_guard_approves_slide_artifact_when_json_invalid():
    ground_truth = GroundTruth(must_include=["slide"], must_not_leak=[])
    meta = {"slides.pptx": {"size": 2048}}
    approved = sanitize_for_export(
        "not json at all",
        "skill instructions here",
        ground_truth,
        slide_task=True,
        artifacts_meta=meta,
    )
    assert approved is not None
    assert export_block_reasons(
        "not json",
        "skill",
        ground_truth,
        slide_task=True,
        artifacts_meta=meta,
    ) == []
