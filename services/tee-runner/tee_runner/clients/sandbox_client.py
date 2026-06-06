"""HTTP client for sandbox-manager sidecar."""

from __future__ import annotations

import httpx


class SandboxClient:
    def __init__(self, base_url: str, timeout: float = 300.0) -> None:
        self._base_url = base_url.rstrip("/")
        self._timeout = timeout

    def prepare(self, session_id: str, zip_bytes: bytes, session_token: str = "") -> None:
        with httpx.Client(base_url=self._base_url, timeout=self._timeout) as client:
            headers = {"Content-Type": "application/zip"}
            if session_token:
                headers["X-Session-Token"] = session_token
            response = client.post(
                f"/v1/sessions/{session_id}/prepare",
                content=zip_bytes,
                headers=headers,
            )
            response.raise_for_status()

    def prepare_papers(self, session_id: str, zip_bytes: bytes, session_token: str = "") -> None:
        with httpx.Client(base_url=self._base_url, timeout=self._timeout) as client:
            headers = {"Content-Type": "application/zip"}
            if session_token:
                headers["X-Session-Token"] = session_token
            response = client.post(
                f"/v1/sessions/{session_id}/papers",
                content=zip_bytes,
                headers=headers,
            )
            response.raise_for_status()

    def run(
        self,
        session_id: str,
        *,
        sample_id: str,
        transcript: str,
        with_skill: bool,
        slide_task: bool = False,
    ) -> str:
        with httpx.Client(base_url=self._base_url, timeout=self._timeout) as client:
            response = client.post(
                f"/v1/sessions/{session_id}/run",
                json={
                    "sample_id": sample_id,
                    "transcript": transcript,
                    "with_skill": with_skill,
                    "slide_task": slide_task,
                },
            )
            response.raise_for_status()
            data = response.json()
            return str(data.get("output", ""))

    def fetch_artifact(self, session_id: str, name: str) -> bytes | None:
        with httpx.Client(base_url=self._base_url, timeout=self._timeout) as client:
            response = client.get(f"/v1/sessions/{session_id}/artifacts/{name}")
            if response.status_code == 404:
                return None
            response.raise_for_status()
            return response.content

    def destroy(self, session_id: str) -> None:
        with httpx.Client(base_url=self._base_url, timeout=self._timeout) as client:
            response = client.delete(f"/v1/sessions/{session_id}")
            if response.status_code not in (200, 404):
                response.raise_for_status()
