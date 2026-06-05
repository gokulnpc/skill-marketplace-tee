import base64
import hashlib
import json
from datetime import datetime, timezone

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey


def get_or_create_signing_key(pem: str | None) -> Ed25519PrivateKey:
    if pem:
        return serialization.load_pem_private_key(pem.encode("utf-8"), password=None)
    return Ed25519PrivateKey.generate()


def canonical_receipt_payload(payload: dict) -> bytes:
    return json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")


def sign_receipt(private_key: Ed25519PrivateKey, payload: dict) -> str:
    signature = private_key.sign(canonical_receipt_payload(payload))
    return base64.b64encode(signature).decode("ascii")


def public_key_pem_from_private(private_key: Ed25519PrivateKey) -> str:
    return (
        private_key.public_key()
        .public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo,
        )
        .decode("utf-8")
    )


def verify_receipt(public_key_pem: str, payload: dict, signature_b64: str) -> bool:
    public_key = serialization.load_pem_public_key(public_key_pem.encode("utf-8"))
    signature = base64.b64decode(signature_b64)
    public_key.verify(signature, canonical_receipt_payload(payload))
    return True


def attestation_ref_from_quote(quote: str) -> str:
    digest = hashlib.sha256(quote.encode("utf-8")).hexdigest()
    return f"sha256:{digest}"


def utc_now() -> datetime:
    return datetime.now(timezone.utc)
