"""dstack TEE adapter — real TDX attestation via Phala/dstack guest agent."""

from __future__ import annotations

import hashlib
import logging

from tee_runner.config import Settings
from tee_runner.crypto.envelope import decrypt_envelope, generate_rsa_keypair
from tee_runner.tee.base import TeeAdapter, TeeAttestation

logger = logging.getLogger(__name__)


class DstackTeeAdapter(TeeAdapter):
    """
    Uses dstack-sdk inside a Phala CVM (/var/run/dstack.sock).
    Session encryption stays RSA-OAEP + AES-GCM (buyer CLI compatibility).
    Attestation uses hardware TDX quotes from get_quote().
    """

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._client = self._create_client(settings)
        self._app_id: str | None = None
        if self._client is not None:
            try:
                info = self._client.info()
                self._app_id = getattr(info, "app_id", None)
                logger.info("dstack connected app_id=%s", self._app_id)
            except Exception as exc:  # noqa: BLE001
                logger.warning("dstack info() failed: %s", exc)

    def _create_client(self, settings: Settings):
        try:
            from dstack_sdk import DstackClient  # type: ignore[import-untyped]
        except ImportError as exc:
            if settings.dstack_strict:
                raise RuntimeError(
                    "RUNNER_MODE=dstack requires dstack-sdk. "
                    "Install with: pip install 'tee-runner[dstack]'"
                ) from exc
            logger.warning("dstack-sdk not installed; attestation will fail in strict mode")
            return None

        if settings.dstack_endpoint:
            return DstackClient(settings.dstack_endpoint)
        return DstackClient()

    def generate_session_keys(self) -> tuple[object, str]:
        # Keep RSA keys so browser/CLI hybrid encryption continues to work.
        return generate_rsa_keypair()

    def get_attestation(self, session_public_key_pem: str) -> TeeAttestation:
        if self._client is None:
            if self._settings.dstack_strict:
                raise RuntimeError(
                    "dstack client unavailable. Deploy inside Phala CVM with "
                    "/var/run/dstack.sock mounted, or set DSTACK_STRICT=false for dev."
                )
            from tee_runner.tee.mock import MockTeeAdapter

            return MockTeeAdapter(self._settings).get_attestation(session_public_key_pem)

        report_data = hashlib.sha256(session_public_key_pem.encode("utf-8")).digest()
        quote_result = self._client.get_quote(report_data)
        quote = quote_result.quote
        if isinstance(quote, bytes):
            quote = quote.hex()

        return TeeAttestation(
            quote=quote,
            runner_hash=self._settings.runner_hash,
            verifier_hash=self._settings.verifier_hash,
            model_hash=self._settings.model_hash,
            ephemeral_public_key=session_public_key_pem,
        )

    def decrypt(self, private_key: object, envelope: dict[str, str]) -> bytes:
        return decrypt_envelope(private_key, envelope)
