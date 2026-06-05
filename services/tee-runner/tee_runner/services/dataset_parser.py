import json
from dataclasses import dataclass

from tee_runner.evaluation.types import GroundTruth, ScoreWeights


@dataclass
class TranscriptSample:
    id: str
    content: str


@dataclass
class EvaluationDataset:
    transcripts: list[TranscriptSample]
    ground_truth: dict[str, GroundTruth]
    weights: ScoreWeights


def parse_transcripts(dataset_bytes: bytes) -> list[dict[str, str]]:
    """Parse transcript samples for inference (simple formats supported)."""
    text = dataset_bytes.decode("utf-8").strip()
    if not text:
        raise ValueError("Dataset is empty")

    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        return [{"id": "sample_001", "content": text}]

    if isinstance(parsed, list):
        return [_normalize_transcript(item, index) for index, item in enumerate(parsed, start=1)]

    if isinstance(parsed, dict) and "transcripts" in parsed:
        transcripts = parsed["transcripts"]
        if not isinstance(transcripts, list):
            raise ValueError("transcripts must be a list")
        return [
            _normalize_transcript(item, index) for index, item in enumerate(transcripts, start=1)
        ]

    raise ValueError("Unsupported dataset JSON format")


def parse_dataset(dataset_bytes: bytes) -> list[dict[str, str]]:
    return parse_transcripts(dataset_bytes)


def parse_evaluation_dataset(dataset_bytes: bytes) -> EvaluationDataset:
    text = dataset_bytes.decode("utf-8").strip()
    if not text:
        raise ValueError("Dataset is empty")

    try:
        parsed = json.loads(text)
    except json.JSONDecodeError as exc:
        raise ValueError("Evaluation dataset must be JSON with ground truth") from exc

    if not isinstance(parsed, dict):
        raise ValueError("Evaluation dataset must be a JSON object")

    transcript_dicts = parse_transcripts(dataset_bytes)
    transcripts = [
        TranscriptSample(id=item["id"], content=item["content"]) for item in transcript_dicts
    ]

    ground_truth_raw = parsed.get("ground_truth", {})
    if not isinstance(ground_truth_raw, dict):
        raise ValueError("ground_truth must be an object")

    ground_truth: dict[str, GroundTruth] = {}
    for transcript_id, rules in ground_truth_raw.items():
        if not isinstance(rules, dict):
            continue
        ground_truth[transcript_id] = GroundTruth(
            must_include=list(rules.get("must_include", [])),
            must_not_leak=list(rules.get("must_not_leak", [])),
            must_remove_attribution=list(rules.get("must_remove_attribution", [])),
        )

    weights = ScoreWeights()
    eval_config = parsed.get("eval_config", {})
    if isinstance(eval_config, dict):
        raw_weights = eval_config.get("weights", {})
        if isinstance(raw_weights, dict):
            weights = ScoreWeights(
                must_not_leak=float(raw_weights.get("must_not_leak", weights.must_not_leak)),
                must_include=float(raw_weights.get("must_include", weights.must_include)),
                attribution_removal=float(
                    raw_weights.get("attribution_removal", weights.attribution_removal)
                ),
                utility=float(raw_weights.get("utility", weights.utility)),
            )

    return EvaluationDataset(
        transcripts=transcripts,
        ground_truth=ground_truth,
        weights=weights,
    )


def parse_skill(skill_bytes: bytes) -> str:
    return skill_bytes.decode("utf-8")


def _normalize_transcript(item: dict | str, index: int) -> dict[str, str]:
    if isinstance(item, str):
        return {"id": f"sample_{index:03d}", "content": item}
    if not isinstance(item, dict):
        raise ValueError("Each transcript entry must be a string or object")
    content = item.get("content")
    if not content:
        raise ValueError("Transcript entry missing content")
    transcript_id = item.get("id") or f"sample_{index:03d}"
    return {"id": transcript_id, "content": content}
