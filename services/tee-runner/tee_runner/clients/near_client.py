"""NEAR AI attestation helpers for tee-runner receipts."""

from __future__ import annotations

import hashlib
from typing import Any

import httpx


def fetch_near_attestation(base_url: str, timeout: float = 30.0) -> dict[str, Any]:
    url = base_url.rstrip("/") + "/v1/attestation/report"
    try:
        with httpx.Client(timeout=timeout) as client:
            response = client.get(url, params={"include_tls_fingerprint": "true"})
            if response.status_code == 404:
                return {"status": "unavailable"}
            response.raise_for_status()
            return response.json()
    except Exception as exc:
        return {"status": "error", "detail": str(exc)}


def attestation_ref(report: dict[str, Any]) -> str:
    raw = str(sorted(report.items())).encode()
    return f"sha256:{hashlib.sha256(raw).hexdigest()}"
