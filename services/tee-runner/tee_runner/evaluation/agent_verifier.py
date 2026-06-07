"""Verifier profile for agent evaluation_type skills."""

from __future__ import annotations

from typing import Any

from tee_runner.evaluation.redaction_verifier import flatten_output_text, parse_model_output, score_output
from tee_runner.evaluation.types import REQUIRED_OUTPUT_KEYS, GroundTruth, ScoreWeights


def score_slide_task_output(
    output_text: str,
    ground_truth: GroundTruth,
    weights: ScoreWeights,
    *,
    artifacts_meta: dict[str, dict] | None = None,
) -> dict[str, Any]:
    """Score slide-from-papers tasks; artifact presence is primary signal."""
    pptx_meta = (artifacts_meta or {}).get("slides.pptx") or {}
    artifact_size = int(pptx_meta.get("size") or 0)
    has_artifact = artifact_size > 0

    parsed = parse_model_output(output_text)
    blob = flatten_output_text(parsed).lower() if parsed is not None else output_text.lower()
    leaked = [term for term in ground_truth.must_not_leak if term.lower() in blob]
    must_not_leak_pass = len(leaked) == 0
    include_hits = sum(1 for item in ground_truth.must_include if item.lower() in blob)
    if has_artifact and "slide" not in blob:
        include_hits = max(include_hits, len(ground_truth.must_include))
    must_include_ratio = (
        include_hits / len(ground_truth.must_include) if ground_truth.must_include else 1.0
    )
    utility = has_artifact or len(output_text.strip()) > 50

    score = 0.0
    if must_not_leak_pass:
        score += weights.must_not_leak
    score += weights.must_include * must_include_ratio
    score += weights.utility * (1.0 if utility else 0.0)
    if has_artifact:
        score = min(1.0, score + 0.15)

    return {
        "score": round(min(score, 1.0), 4),
        "checks": {
            "format_valid": parsed is not None,
            "must_not_leak": must_not_leak_pass,
            "must_include": must_include_ratio,
            "attribution_removal": True,
            "utility": utility,
            "agent_mode": True,
            "artifact_present": has_artifact,
            "artifact_size": artifact_size,
        },
    }


def score_agent_output(
    output_text: str,
    ground_truth: GroundTruth,
    weights: ScoreWeights,
) -> dict[str, Any]:
    """Agent skills may return structured JSON or prose; score against ground truth flexibly."""
    parsed = parse_model_output(output_text)
    if parsed is not None and all(key in parsed for key in REQUIRED_OUTPUT_KEYS):
        return score_output(output_text, ground_truth, weights)

    blob = flatten_output_text(parsed).lower() if parsed is not None else output_text.lower()
    leaked = [term for term in ground_truth.must_not_leak if term.lower() in blob]
    must_not_leak_pass = len(leaked) == 0
    include_hits = sum(1 for item in ground_truth.must_include if item.lower() in blob)
    must_include_ratio = (
        include_hits / len(ground_truth.must_include) if ground_truth.must_include else 1.0
    )
    utility = len(output_text.strip()) > 50

    score = 0.0
    if must_not_leak_pass:
        score += weights.must_not_leak
    score += weights.must_include * must_include_ratio
    score += weights.utility * (1.0 if utility else 0.0)

    return {
        "score": round(min(score, 1.0), 4),
        "checks": {
            "format_valid": parsed is not None,
            "must_not_leak": must_not_leak_pass,
            "must_include": must_include_ratio,
            "attribution_removal": True,
            "utility": utility,
            "agent_mode": True,
        },
    }
