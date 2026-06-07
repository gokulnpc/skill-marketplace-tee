"""Per-session skill sandbox — unpack zip and run agent harness."""

from __future__ import annotations

import io
import json
import os
import shutil
import tempfile
import zipfile
from pathlib import Path
from typing import Any

from sandbox_manager.harness_runner import run_harness
from sandbox_manager.types import SessionSandbox


class SandboxStore:
    def __init__(self) -> None:
        self._sessions: dict[str, SessionSandbox] = {}
        self._base = Path(os.environ.get("SANDBOX_DATA_DIR", "/tmp/skillvault-sandbox"))
        self._base.mkdir(parents=True, exist_ok=True)

    def prepare(
        self, session_id: str, zip_bytes: bytes, model_proxy_url: str, session_token: str = ""
    ) -> SessionSandbox:
        self.destroy(session_id)
        root = self._base / session_id
        root.mkdir(parents=True, exist_ok=True)
        skill_dir = root / "skill"
        dataset_dir = root / "dataset"
        workspace = root / "workspace"
        skill_dir.mkdir()
        dataset_dir.mkdir()
        workspace.mkdir()

        with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
            for info in zf.infolist():
                if info.is_dir():
                    continue
                name = info.filename.replace("\\", "/").lstrip("/")
                if ".." in name.split("/"):
                    raise ValueError(f"Unsafe path: {name}")
                dest = skill_dir / name
                if not str(dest.resolve()).startswith(str(skill_dir.resolve())):
                    raise ValueError(f"Path traversal: {name}")
                dest.parent.mkdir(parents=True, exist_ok=True)
                dest.write_bytes(zf.read(info))

        manifest_path = skill_dir / "skill" / "manifest.json"
        if not manifest_path.exists():
            manifest_path = skill_dir / "manifest.json"
        manifest: dict[str, Any] = {}
        if manifest_path.exists():
            manifest = json.loads(manifest_path.read_text())

        session = SessionSandbox(
            session_id=session_id,
            root=root,
            manifest=manifest,
            model_proxy_url=model_proxy_url,
            session_token=session_token,
        )
        self._sessions[session_id] = session
        return session

    def get(self, session_id: str) -> SessionSandbox:
        if session_id not in self._sessions:
            raise KeyError(f"Session not prepared: {session_id}")
        return self._sessions[session_id]

    def destroy(self, session_id: str) -> None:
        if session_id in self._sessions:
            root = self._sessions[session_id].root
            if root.exists():
                shutil.rmtree(root, ignore_errors=True)
            del self._sessions[session_id]

    def prepare_papers(self, session_id: str, zip_bytes: bytes) -> None:
        session = self.get(session_id)
        papers_dir = session.root / "dataset" / "papers"
        papers_dir.mkdir(parents=True, exist_ok=True)
        with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
            for info in zf.infolist():
                if info.is_dir():
                    continue
                name = info.filename.replace("\\", "/").lstrip("/")
                if name.startswith("__MACOSX/") or "/._" in name or ".." in name.split("/"):
                    continue
                ext = Path(name).suffix.lower()
                if ext not in {".pdf", ".md", ".txt", ".markdown"}:
                    continue
                dest = papers_dir / name
                dest.parent.mkdir(parents=True, exist_ok=True)
                dest.write_bytes(zf.read(info))

    def get_artifact(self, session_id: str, name: str) -> bytes | None:
        session = self.get(session_id)
        path = session.root / "workspace" / "output" / name
        if not path.exists():
            return None
        return path.read_bytes()

    def run_sample(
        self,
        session_id: str,
        *,
        sample_id: str,
        transcript: str,
        with_skill: bool,
        slide_task: bool = False,
    ) -> str:
        session = self.get(session_id)
        sample_path = session.root / "dataset" / f"{sample_id}.json"
        sample_path.write_text(json.dumps({"id": sample_id, "content": transcript}))
        if slide_task or session.manifest.get("evaluation_type") == "agent":
            from sandbox_manager.agent_harness import run_agent_harness

            return run_agent_harness(
                session,
                transcript=transcript,
                with_skill=with_skill,
                slide_task=slide_task,
            )
        return run_harness(session, with_skill=with_skill)
