import hashlib

from tee_runner.evaluation.scoring_pipeline import EvaluationSummary, evaluate_samples
from tee_runner.services.dataset_parser import parse_evaluation_dataset, parse_skill
from tee_runner.session.store import SessionRecord


def compute_skill_hash(skill_bytes: bytes) -> str:
    digest = hashlib.sha256(skill_bytes).hexdigest()
    return f"sha256:{digest}"


class EvaluationService:
    def run_session_evaluation(self, record: SessionRecord) -> EvaluationSummary:
        if record.inference_results is None:
            raise ValueError("Inference must complete before evaluation")
        if record.skill_plaintext is None or record.dataset_plaintext is None:
            raise ValueError("Session is missing decrypted skill or dataset")

        skill_content = parse_skill(record.skill_plaintext)
        dataset = parse_evaluation_dataset(record.dataset_plaintext)

        return evaluate_samples(
            inference_results=record.inference_results,
            ground_truth_map=dataset.ground_truth,
            skill_content=skill_content,
            weights=dataset.weights,
        )
