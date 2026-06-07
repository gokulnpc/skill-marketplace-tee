from tee_runner.evaluation.scoring_pipeline import EvaluationSummary, evaluate_samples
from tee_runner.services.dataset_parser import parse_evaluation_dataset
from tee_runner.services.package_loader import parse_skill_package
from tee_runner.services.papers_zip import is_papers_zip
from tee_runner.session.store import SessionRecord


def compute_skill_hash(skill_bytes: bytes) -> str:
    return parse_skill_package(skill_bytes).tree_hash


class EvaluationService:
    def run_session_evaluation(self, record: SessionRecord) -> EvaluationSummary:
        if record.inference_results is None:
            raise ValueError("Inference must complete before evaluation")
        if record.skill_plaintext is None or record.dataset_plaintext is None:
            raise ValueError("Session is missing decrypted skill or dataset")

        pkg = parse_skill_package(record.skill_plaintext)
        skill_content = pkg.skill_md
        dataset = parse_evaluation_dataset(record.dataset_plaintext)
        eval_type = (
            pkg.metadata.get("evaluation_type")
            or pkg.manifest.get("evaluation_type")
            or dataset.evaluation_type
            or "redaction"
        )
        slide_task = is_papers_zip(record.dataset_plaintext)

        return evaluate_samples(
            inference_results=record.inference_results,
            ground_truth_map=dataset.ground_truth,
            skill_content=skill_content,
            weights=dataset.weights,
            evaluation_type=eval_type,
            slide_task=slide_task,
            artifacts_meta=record.artifacts_meta,
        )
