from dataclasses import dataclass

from tee_runner.evaluation.leakage_guard import export_block_reasons, sanitize_for_export
from tee_runner.evaluation.redaction_verifier import score_output
from tee_runner.evaluation.types import GroundTruth, ScoreWeights


@dataclass
class SampleEvaluation:
    transcript_id: str
    baseline_score: float
    skill_score: float
    baseline_checks: dict
    skill_checks: dict
    approved_output: str | None
    leakage_blocked: bool
    leakage_reasons: list[str]


@dataclass
class EvaluationSummary:
    baseline_score: float
    skill_score: float
    uplift: float
    sample_count: int
    samples: list[SampleEvaluation]


def aggregate_scores(scores: list[float]) -> float:
    if not scores:
        return 0.0
    return round(sum(scores) / len(scores), 4)


def evaluate_samples(
    inference_results: list[dict],
    ground_truth_map: dict[str, GroundTruth],
    skill_content: str,
    weights: ScoreWeights,
) -> EvaluationSummary:
    samples: list[SampleEvaluation] = []

    for result in inference_results:
        transcript_id = result["transcript_id"]
        ground_truth = ground_truth_map.get(transcript_id, GroundTruth())

        baseline_eval = score_output(result["baseline_output"], ground_truth, weights)
        skill_eval = score_output(result["with_skill_output"], ground_truth, weights)

        approved = sanitize_for_export(
            result["with_skill_output"], skill_content, ground_truth
        )
        leakage_blocked = approved is None
        leakage_reasons = (
            export_block_reasons(result["with_skill_output"], skill_content, ground_truth)
            if leakage_blocked
            else []
        )

        skill_score = 0.0 if leakage_blocked else skill_eval["score"]

        samples.append(
            SampleEvaluation(
                transcript_id=transcript_id,
                baseline_score=baseline_eval["score"],
                skill_score=skill_score,
                baseline_checks=baseline_eval["checks"],
                skill_checks=skill_eval["checks"],
                approved_output=approved,
                leakage_blocked=leakage_blocked,
                leakage_reasons=leakage_reasons,
            )
        )

    baseline_scores = [sample.baseline_score for sample in samples]
    skill_scores = [sample.skill_score for sample in samples]
    baseline_score = aggregate_scores(baseline_scores)
    skill_score = aggregate_scores(skill_scores)

    return EvaluationSummary(
        baseline_score=baseline_score,
        skill_score=skill_score,
        uplift=round(skill_score - baseline_score, 4),
        sample_count=len(samples),
        samples=samples,
    )
