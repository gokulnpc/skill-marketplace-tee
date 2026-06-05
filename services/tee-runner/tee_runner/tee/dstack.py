"""dstack TEE adapter — uses simulator or socket when dstack-sdk is available."""

from tee_runner.config import Settings
from tee_runner.crypto.envelope import decrypt_envelope, generate_rsa_keypair
from tee_runner.tee.base import TeeAdapter, TeeAttestation
from tee_runner.tee.mock import MockTeeAdapter


class DstackTeeAdapter(TeeAdapter):
    """
    Phase 1 stub: falls back to mock crypto locally.
    When deployed in Phala CVM, wire dstack-sdk get_quote() and get_tls_key().
    """

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._fallback = MockTeeAdapter(settings)
        self._client = self._try_create_client(settings)

    def _try_create_client(self, settings: Settings):
        try:
            from dstack import DstackClient  # type: ignore[import-untyped]
        except ImportError:
            return None

        endpoint = settings.dstack_endpoint
        if endpoint:
            return DstackClient(endpoint=endpoint)
        return DstackClient()

    def generate_session_keys(self) -> tuple[object, str]:
        if self._client is None:
            return self._fallback.generate_session_keys()

        try:
            tls = self._client.get_tls_key()
            return tls.private_key, tls.certificate
        except Exception:
            return self._fallback.generate_session_keys()

    def get_attestation(self, session_public_key_pem: str) -> TeeAttestation:
        if self._client is None:
            return self._fallback.get_attestation(session_public_key_pem)

        try:
            report_data = session_public_key_pem.encode("utf-8")[:64]
            result = self._client.get_quote(report_data)
            return TeeAttestation(
                quote=result.quote,
                runner_hash=self._settings.runner_hash,
                verifier_hash=self._settings.verifier_hash,
                model_hash=self._settings.model_hash,
                ephemeral_public_key=session_public_key_pem,
            )
        except Exception:
            return self._fallback.get_attestation(session_public_key_pem)

    def decrypt(self, private_key: object, envelope: dict[str, str]) -> bytes:
        return decrypt_envelope(private_key, envelope)
