import base64
import hashlib

from tee_runner.config import Settings
from tee_runner.crypto.envelope import decrypt_envelope, generate_rsa_keypair
from tee_runner.tee.base import TeeAdapter, TeeAttestation


class MockTeeAdapter(TeeAdapter):
    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    def generate_session_keys(self) -> tuple[object, str]:
        return generate_rsa_keypair()

    def get_attestation(self, session_public_key_pem: str) -> TeeAttestation:
        key_digest = hashlib.sha256(session_public_key_pem.encode("utf-8")).digest()[:32]
        quote_payload = {
            "type": "mock-tdx-quote",
            "runner_hash": self._settings.runner_hash,
            "report_data": base64.b64encode(key_digest).decode("ascii"),
        }
        quote = base64.b64encode(str(quote_payload).encode("utf-8")).decode("ascii")
        return TeeAttestation(
            quote=quote,
            runner_hash=self._settings.runner_hash,
            verifier_hash=self._settings.verifier_hash,
            model_hash=self._settings.model_hash,
            ephemeral_public_key=session_public_key_pem,
        )

    def decrypt(self, private_key: object, envelope: dict[str, str]) -> bytes:
        return decrypt_envelope(private_key, envelope)
