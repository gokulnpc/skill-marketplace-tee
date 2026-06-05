import secrets
from dataclasses import dataclass, field
from datetime import datetime

from tee_runner.crypto.receipt import utc_now
from tee_runner.models import SessionStatus


@dataclass
class SessionRecord:
    session_id: str
    skill_id: str
    threshold: float
    status: SessionStatus
    private_key: object
    public_key_pem: str
    attestation_quote: str
    created_at: datetime = field(default_factory=utc_now)
    skill_plaintext: bytes | None = None
    dataset_plaintext: bytes | None = None
    inference_results: list[dict] | None = None
    evaluation_results: dict | None = None
    receipt: dict | None = None
    receipt_signature: str | None = None


class SessionStore:
    def __init__(self) -> None:
        self._sessions: dict[str, SessionRecord] = {}

    def create(
        self,
        skill_id: str,
        threshold: float,
        private_key: object,
        public_key_pem: str,
        attestation_quote: str,
    ) -> SessionRecord:
        session_id = f"sess_{secrets.token_hex(8)}"
        record = SessionRecord(
            session_id=session_id,
            skill_id=skill_id,
            threshold=threshold,
            status=SessionStatus.ATTESTATION_READY,
            private_key=private_key,
            public_key_pem=public_key_pem,
            attestation_quote=attestation_quote,
        )
        self._sessions[session_id] = record
        return record

    def get(self, session_id: str) -> SessionRecord | None:
        return self._sessions.get(session_id)

    def update_status_after_input(self, record: SessionRecord) -> None:
        has_skill = record.skill_plaintext is not None
        has_dataset = record.dataset_plaintext is not None
        if has_skill and has_dataset:
            record.status = SessionStatus.INPUTS_RECEIVED
        elif has_skill or has_dataset:
            record.status = SessionStatus.INPUTS_PARTIAL
