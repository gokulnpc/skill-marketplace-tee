import secrets
from datetime import datetime

from fastapi import HTTPException, status

from tee_runner.config import Settings
from tee_runner.crypto.receipt import (
    attestation_ref_from_quote,
    get_or_create_signing_key,
    sign_receipt,
    utc_now,
)
from tee_runner.models import (
    AttestationResponse,
    CreateSessionRequest,
    CreateSessionResponse,
    EncryptedEnvelope,
    EncryptedInputResponse,
    EvaluationResponse,
    FinalizeRequest,
    InferenceResponse,
    ReceiptResponse,
    SampleEvaluationResult,
    SessionResponse,
    SessionStatus,
    TranscriptInferenceResult,
)
from tee_runner.services.evaluation_service import EvaluationService, compute_skill_hash
from tee_runner.services.inference_service import InferenceService
from tee_runner.session.store import SessionRecord, SessionStore
from tee_runner.tee.base import TeeAdapter


class SessionService:
    def __init__(
        self,
        store: SessionStore,
        tee: TeeAdapter,
        settings: Settings,
        signing_key=None,
        inference_service: InferenceService | None = None,
        evaluation_service: EvaluationService | None = None,
    ) -> None:
        self._store = store
        self._tee = tee
        self._settings = settings
        self._signing_key = signing_key or get_or_create_signing_key(
            settings.receipt_signing_key_pem
        )
        self._inference_service = inference_service
        self._evaluation_service = evaluation_service

    def create_session(self, request: CreateSessionRequest) -> CreateSessionResponse:
        private_key, public_key_pem = self._tee.generate_session_keys()
        attestation = self._tee.get_attestation(public_key_pem)
        record = self._store.create(
            skill_id=request.skill_id,
            threshold=request.threshold,
            private_key=private_key,
            public_key_pem=public_key_pem,
            attestation_quote=attestation.quote,
        )
        return CreateSessionResponse(session_id=record.session_id, status=record.status)

    def get_session(self, session_id: str) -> SessionResponse:
        record = self._require_session(session_id)
        return SessionResponse(
            session_id=record.session_id,
            skill_id=record.skill_id,
            threshold=record.threshold,
            status=record.status,
            has_skill=record.skill_plaintext is not None,
            has_dataset=record.dataset_plaintext is not None,
            has_inference=record.inference_results is not None,
            has_evaluation=record.evaluation_results is not None,
            receipt_id=record.receipt["receipt_id"] if record.receipt else None,
        )

    def get_attestation(self, session_id: str) -> AttestationResponse:
        record = self._require_session(session_id)
        attestation = self._tee.get_attestation(record.public_key_pem)
        return AttestationResponse(
            attestation_quote=attestation.quote,
            runner_hash=attestation.runner_hash,
            verifier_hash=attestation.verifier_hash,
            model_hash=attestation.model_hash,
            ephemeral_public_key=attestation.ephemeral_public_key,
            session_id=record.session_id,
            timestamp=utc_now(),
            mode=self._settings.runner_mode,
        )

    def submit_skill(self, session_id: str, envelope: EncryptedEnvelope) -> EncryptedInputResponse:
        record = self._require_session(session_id)
        self._guard_not_finalized(record)
        record.skill_plaintext = self._tee.decrypt(record.private_key, envelope.model_dump())
        self._store.update_status_after_input(record)
        return EncryptedInputResponse(
            session_id=session_id,
            input_type="skill",
            received=True,
            status=record.status,
        )

    def submit_dataset(
        self, session_id: str, envelope: EncryptedEnvelope
    ) -> EncryptedInputResponse:
        record = self._require_session(session_id)
        self._guard_not_finalized(record)
        record.dataset_plaintext = self._tee.decrypt(record.private_key, envelope.model_dump())
        self._store.update_status_after_input(record)
        return EncryptedInputResponse(
            session_id=session_id,
            input_type="dataset",
            received=True,
            status=record.status,
        )

    def run_inference(self, session_id: str) -> InferenceResponse:
        record = self._require_session(session_id)
        self._guard_not_finalized(record)

        if record.inference_results is not None:
            return self._to_inference_response(record)

        if record.skill_plaintext is None or record.dataset_plaintext is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Both encrypted skill and dataset must be received before inference",
            )
        if self._inference_service is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Model server is not configured",
            )

        try:
            record.inference_results = self._inference_service.run_session_inference(record)
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Model inference failed: {exc}",
            ) from exc

        record.status = SessionStatus.INFERENCE_COMPLETE
        return self._to_inference_response(record)

    def run_evaluation(self, session_id: str) -> EvaluationResponse:
        record = self._require_session(session_id)
        self._guard_not_finalized(record)

        if record.evaluation_results is not None:
            return self._to_evaluation_response(record)

        if record.inference_results is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Inference must complete before evaluation",
            )
        if self._evaluation_service is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Evaluation service is not configured",
            )

        try:
            summary = self._evaluation_service.run_session_evaluation(record)
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

        record.evaluation_results = {
            "baseline_score": summary.baseline_score,
            "skill_score": summary.skill_score,
            "uplift": summary.uplift,
            "sample_count": summary.sample_count,
            "samples": [
                {
                    "transcript_id": sample.transcript_id,
                    "baseline_score": sample.baseline_score,
                    "skill_score": sample.skill_score,
                    "baseline_checks": sample.baseline_checks,
                    "skill_checks": sample.skill_checks,
                    "approved_output": sample.approved_output,
                    "leakage_blocked": sample.leakage_blocked,
                    "leakage_reasons": sample.leakage_reasons,
                }
                for sample in summary.samples
            ],
        }
        record.status = SessionStatus.EVALUATED
        return self._to_evaluation_response(record)

    def finalize(self, session_id: str, request: FinalizeRequest) -> ReceiptResponse:
        record = self._require_session(session_id)
        if record.status == SessionStatus.FINALIZED and record.receipt:
            return self._to_receipt_response(record)

        if record.skill_plaintext is None or record.dataset_plaintext is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Both encrypted skill and dataset must be received before finalize",
            )

        baseline_score = request.baseline_score
        skill_score = request.skill_score
        if baseline_score is None or skill_score is None:
            if record.evaluation_results is None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Provide scores or run /evaluate before finalize",
                )
            baseline_score = record.evaluation_results["baseline_score"]
            skill_score = record.evaluation_results["skill_score"]

        skill_hash = request.skill_hash
        if skill_hash is None and record.skill_plaintext is not None:
            skill_hash = compute_skill_hash(record.skill_plaintext)
        if skill_hash is None:
            skill_hash = "sha256:unknown"

        uplift = skill_score - baseline_score
        passed = skill_score >= record.threshold
        attestation_ref = attestation_ref_from_quote(record.attestation_quote)
        receipt_id = f"rcpt_{secrets.token_hex(8)}"
        timestamp = utc_now()

        payload = {
            "receipt_id": receipt_id,
            "session_id": record.session_id,
            "skill_id": record.skill_id,
            "skill_hash": skill_hash,
            "runner_hash": self._settings.runner_hash,
            "verifier_hash": self._settings.verifier_hash,
            "model_hash": self._settings.model_hash,
            "baseline_score": baseline_score,
            "skill_score": skill_score,
            "uplift": uplift,
            "threshold": record.threshold,
            "passed": passed,
            "attestation_ref": attestation_ref,
            "timestamp": timestamp.isoformat(),
        }
        signature = sign_receipt(self._signing_key, payload)

        record.receipt = payload
        record.receipt_signature = signature
        record.status = SessionStatus.FINALIZED
        record.skill_plaintext = None
        record.dataset_plaintext = None

        return self._to_receipt_response(record)

    def get_receipt(self, session_id: str) -> ReceiptResponse:
        record = self._require_session(session_id)
        if not record.receipt or not record.receipt_signature:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Receipt not available; finalize the session first",
            )
        return self._to_receipt_response(record)

    def get_signing_public_key_pem(self) -> str:
        from tee_runner.crypto.receipt import public_key_pem_from_private

        return public_key_pem_from_private(self._signing_key)

    def verify_session_receipt(self, session_id: str) -> dict[str, bool | str]:
        from tee_runner.crypto.receipt import public_key_pem_from_private, verify_receipt

        record = self._require_session(session_id)
        if not record.receipt or not record.receipt_signature:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Receipt not available; finalize the session first",
            )
        public_key_pem = public_key_pem_from_private(self._signing_key)
        try:
            verify_receipt(public_key_pem, record.receipt, record.receipt_signature)
            valid = True
        except Exception:
            valid = False
        return {
            "valid": valid,
            "receipt_id": record.receipt["receipt_id"],
            "session_id": session_id,
        }

    def _require_session(self, session_id: str) -> SessionRecord:
        record = self._store.get(session_id)
        if record is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
        return record

    @staticmethod
    def _guard_not_finalized(record: SessionRecord) -> None:
        if record.status == SessionStatus.FINALIZED:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Session already finalized",
            )

    @staticmethod
    def _to_receipt_response(record: SessionRecord) -> ReceiptResponse:
        assert record.receipt is not None
        assert record.receipt_signature is not None
        timestamp = record.receipt["timestamp"]
        if isinstance(timestamp, str):
            timestamp = datetime.fromisoformat(timestamp)
        return ReceiptResponse(
            receipt_id=record.receipt["receipt_id"],
            session_id=record.receipt["session_id"],
            skill_id=record.receipt["skill_id"],
            skill_hash=record.receipt["skill_hash"],
            runner_hash=record.receipt["runner_hash"],
            verifier_hash=record.receipt["verifier_hash"],
            model_hash=record.receipt["model_hash"],
            baseline_score=record.receipt["baseline_score"],
            skill_score=record.receipt["skill_score"],
            uplift=record.receipt["uplift"],
            threshold=record.receipt["threshold"],
            passed=record.receipt["passed"],
            attestation_ref=record.receipt["attestation_ref"],
            timestamp=timestamp,
            signature=record.receipt_signature,
        )

    @staticmethod
    def _to_inference_response(record: SessionRecord) -> InferenceResponse:
        assert record.inference_results is not None
        return InferenceResponse(
            session_id=record.session_id,
            status=record.status,
            sample_count=len(record.inference_results),
            results=[TranscriptInferenceResult(**item) for item in record.inference_results],
        )

    def _to_evaluation_response(self, record: SessionRecord) -> EvaluationResponse:
        assert record.evaluation_results is not None
        return EvaluationResponse(
            session_id=record.session_id,
            status=record.status,
            baseline_score=record.evaluation_results["baseline_score"],
            skill_score=record.evaluation_results["skill_score"],
            uplift=record.evaluation_results["uplift"],
            threshold=record.threshold,
            passed=record.evaluation_results["skill_score"] >= record.threshold,
            sample_count=record.evaluation_results["sample_count"],
            samples=[SampleEvaluationResult(**item) for item in record.evaluation_results["samples"]],
        )
