from tee_runner.clients.model_client import ModelClient
from tee_runner.services.dataset_parser import parse_dataset, parse_skill
from tee_runner.services.prompts import build_baseline_messages, build_with_skill_messages
from tee_runner.session.store import SessionRecord


class InferenceService:
    def __init__(self, model_client: ModelClient) -> None:
        self._model_client = model_client

    def run_session_inference(self, record: SessionRecord) -> list[dict]:
        if record.skill_plaintext is None or record.dataset_plaintext is None:
            raise ValueError("Session is missing decrypted skill or dataset")

        skill_content = parse_skill(record.skill_plaintext)
        transcripts = parse_dataset(record.dataset_plaintext)
        results: list[dict] = []

        for sample in transcripts:
            baseline_output = self._model_client.chat_completion(
                build_baseline_messages(sample["content"])
            )
            with_skill_output = self._model_client.chat_completion(
                build_with_skill_messages(skill_content, sample["content"])
            )
            results.append(
                {
                    "transcript_id": sample["id"],
                    "baseline_output": baseline_output,
                    "with_skill_output": with_skill_output,
                }
            )

        return results
