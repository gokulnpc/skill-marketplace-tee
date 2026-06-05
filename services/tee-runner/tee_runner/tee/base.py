from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class TeeAttestation:
    quote: str
    runner_hash: str
    verifier_hash: str
    model_hash: str
    ephemeral_public_key: str


class TeeAdapter(ABC):
    @abstractmethod
    def generate_session_keys(self) -> tuple[object, str]:
        """Return (private_key_handle, public_key_pem)."""

    @abstractmethod
    def get_attestation(self, session_public_key_pem: str) -> TeeAttestation:
        """Return attestation bundle for a session."""

    @abstractmethod
    def decrypt(self, private_key: object, envelope: dict[str, str]) -> bytes:
        """Decrypt an encrypted input envelope."""
