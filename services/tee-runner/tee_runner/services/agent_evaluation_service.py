"""Agent-based evaluation replacing single-shot inference."""

from __future__ import annotations

import hashlib
import json
import logging
import tempfile
import time
from pathlib import Path

import httpx

from tee_runner.clients.model_client import ModelClient
from tee_runner.clients.sandbox_client import SandboxClient
from tee_runner.services.builtin_harness import (
    extract_files_from_zip_bytes,
    merge_papers_into_files,
    run_builtin_agent,
)
from tee_runner.services.dataset_parser import parse_dataset
from tee_runner.services.package_loader import parse_skill_package, resolve_knowledge_dirs
from tee_runner.services.papers_zip import is_papers_zip
from tee_runner.session.store import SessionRecord

logger = logging.getLogger(__name__)

DEBUG_LOG_PATH = Path(__file__).resolve().parents[4] / ".cursor" / "debug-563348.log"


def _debug_log(message: str, data: dict, hypothesis_id: str) -> None:
    # #region agent log
    try:
        payload = {
            "sessionId": "563348",
            "timestamp": int(time.time() * 1000),
            "location": "agent_evaluation_service.py",
            "message": message,
            "data": data,
            "hypothesisId": hypothesis_id,
        }
        DEBUG_LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
        with DEBUG_LOG_PATH.open("a", encoding="utf-8") as fh:
            fh.write(json.dumps(payload) + "\n")
    except OSError:
        pass
    logger.warning("%s %s", message, data)
    # #endregion


def _load_skill_content(pkg, slide_task: bool) -> str:
    if slide_task and pkg.manifest.get("entrypoints", {}).get("work"):
        work_name = pkg.manifest["entrypoints"]["work"]
        # work entry may be work_skill.md — use skill_md fallback if not separate file
        return pkg.skill_md
    return pkg.skill_md


def _collect_artifact(record: SessionRecord, path: Path) -> None:
    if not path.exists():
        return
    data = path.read_bytes()
    if record.artifacts is None:
        record.artifacts = {}
    if record.artifacts_meta is None:
        record.artifacts_meta = {}
    record.artifacts["slides.pptx"] = data
    record.artifacts_meta["slides.pptx"] = {
        "sha256": f"sha256:{hashlib.sha256(data).hexdigest()}",
        "size": len(data),
        "content_type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    }


class AgentEvaluationService:
    def __init__(
        self,
        model_client: ModelClient,
        sandbox_client: SandboxClient | None = None,
        *,
        use_sandbox_for_agent: bool = False,
    ) -> None:
        self._model_client = model_client
        self._sandbox_client = sandbox_client
        self._use_sandbox_for_agent = use_sandbox_for_agent

    def _sandbox_ready(self) -> bool:
        if self._sandbox_client is None:
            return False
        try:
            with httpx.Client(timeout=2.0) as client:
                response = client.get(f"{self._sandbox_client._base_url}/health")
                return response.status_code == 200
        except Exception as exc:
            _debug_log(
                "sandbox health check failed",
                {"error": str(exc), "base_url": self._sandbox_client._base_url},
                "A",
            )
            return False

    def run_session_inference(self, record: SessionRecord) -> list[dict]:
        if record.skill_plaintext is None or record.dataset_plaintext is None:
            raise ValueError("Session is missing decrypted skill or dataset")

        pkg = parse_skill_package(record.skill_plaintext)
        files = extract_files_from_zip_bytes(record.skill_plaintext)
        slide_task = is_papers_zip(record.dataset_plaintext)
        if slide_task:
            files = merge_papers_into_files(files, record.dataset_plaintext)
        knowledge_dirs = resolve_knowledge_dirs(pkg.manifest, files)
        harness = pkg.manifest.get("harness", {})
        max_iterations = int(harness.get("max_iterations", 16 if slide_task else 12))
        runtime = harness.get("runtime", "builtin")
        evaluation_type = pkg.metadata.get("evaluation_type") or pkg.manifest.get(
            "evaluation_type", "redaction"
        )
        skill_content = _load_skill_content(pkg, slide_task)
        transcripts = parse_dataset(record.dataset_plaintext)
        results: list[dict] = []
        total_tool_calls = 0
        total_iterations = 0

        sandbox_ready = self._sandbox_ready()
        use_sandbox = (
            self._use_sandbox_for_agent
            and sandbox_ready
            and evaluation_type == "agent"
            and slide_task
        )
        _debug_log(
            "agent inference path",
            {
                "use_sandbox": use_sandbox,
                "use_sandbox_for_agent": self._use_sandbox_for_agent,
                "sandbox_ready": sandbox_ready,
                "evaluation_type": evaluation_type,
                "slide_task": slide_task,
            },
            "A",
        )

        workspace = Path(tempfile.mkdtemp(prefix=f"sv_{record.session_id}_"))
        record.workspace_dir = str(workspace)

        if use_sandbox:
            token = record.session_token or ""
            self._sandbox_client.prepare(record.session_id, record.skill_plaintext, token)
            self._sandbox_client.prepare_papers(record.session_id, record.dataset_plaintext, token)

        try:
            for sample in transcripts:
                if use_sandbox:
                    baseline_output = self._sandbox_client.run(
                        record.session_id,
                        sample_id=sample["id"],
                        transcript=sample["content"],
                        with_skill=False,
                        slide_task=slide_task,
                    )
                    with_skill_output = self._sandbox_client.run(
                        record.session_id,
                        sample_id=sample["id"],
                        transcript=sample["content"],
                        with_skill=True,
                        slide_task=slide_task,
                    )
                    artifact_bytes = self._sandbox_client.fetch_artifact(
                        record.session_id, "slides.pptx"
                    )
                    if artifact_bytes:
                        if record.artifacts is None:
                            record.artifacts = {}
                        record.artifacts["slides.pptx"] = artifact_bytes
                        record.artifacts_meta = {
                            "slides.pptx": {
                                "sha256": f"sha256:{hashlib.sha256(artifact_bytes).hexdigest()}",
                                "size": len(artifact_bytes),
                                "content_type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                            }
                        }
                elif runtime == "builtin":
                    baseline_output, baseline_metrics = run_builtin_agent(
                        self._model_client,
                        skill_content="",
                        transcript=sample["content"],
                        files=files,
                        knowledge_dirs=knowledge_dirs,
                        with_skill=False,
                        evaluation_type=evaluation_type,
                        max_iterations=max_iterations,
                        workspace=workspace,
                        slide_task=slide_task,
                    )
                    with_skill_output, skill_metrics = run_builtin_agent(
                        self._model_client,
                        skill_content=skill_content,
                        transcript=sample["content"],
                        files=files,
                        knowledge_dirs=knowledge_dirs,
                        with_skill=True,
                        evaluation_type=evaluation_type,
                        max_iterations=max_iterations,
                        workspace=workspace,
                        slide_task=slide_task,
                    )
                    total_tool_calls += skill_metrics.tool_calls
                    total_iterations += skill_metrics.iterations
                    if skill_metrics.artifact_path:
                        _collect_artifact(record, Path(skill_metrics.artifact_path))
                elif self._sandbox_client:
                    token = record.session_token or ""
                    self._sandbox_client.prepare(record.session_id, record.skill_plaintext, token)
                    baseline_output = self._sandbox_client.run(
                        record.session_id,
                        sample_id=sample["id"],
                        transcript=sample["content"],
                        with_skill=False,
                    )
                    with_skill_output = self._sandbox_client.run(
                        record.session_id,
                        sample_id=sample["id"],
                        transcript=sample["content"],
                        with_skill=True,
                    )
                else:
                    raise ValueError(f"Harness runtime {runtime} requires sandbox-manager")

                results.append(
                    {
                        "transcript_id": sample["id"],
                        "baseline_output": baseline_output,
                        "with_skill_output": with_skill_output,
                    }
                )
        finally:
            if use_sandbox and self._sandbox_client:
                self._sandbox_client.destroy(record.session_id)

        if record.agent_metrics is None:
            record.agent_metrics = {}
        record.agent_metrics["harness_runtime"] = "sandbox" if use_sandbox else runtime
        record.agent_metrics["iterations_cap"] = max_iterations
        record.agent_metrics["tool_calls"] = total_tool_calls
        record.agent_metrics["iterations_used"] = total_iterations
        record.agent_metrics["evaluation_type"] = evaluation_type
        record.agent_metrics["slide_task"] = slide_task
        if record.artifacts_meta and "slides.pptx" in record.artifacts_meta:
            record.agent_metrics["artifact_generated"] = True
        record.skill_manifest = pkg.manifest
        record.skill_package_hash = pkg.tree_hash

        return results
