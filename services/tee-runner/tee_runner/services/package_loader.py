"""Safe zip package extraction and tree hashing."""

from __future__ import annotations

import hashlib
import io
import json
import zipfile
from dataclasses import dataclass
from pathlib import PurePosixPath
from typing import Any

HASH_EXCLUDED_PREFIXES = ("adapters/", ".git/")
MAX_ZIP_BYTES = 52_428_800
MAX_FILES = 5000
MAX_FILE_BYTES = 10_485_760


@dataclass
class SkillPackage:
    zip_bytes: bytes
    skill_md: str
    manifest: dict[str, Any]
    metadata: dict[str, Any]
    tree_hash: str
    harness_runtime: str
    skill_root: str = "skill"
    extracted_dir: str | None = None


def _should_include_in_tree(relpath: str) -> bool:
    normalized = relpath.replace("\\", "/").lstrip("/")
    if not normalized or normalized.endswith("/"):
        return False
    if normalized.startswith("__MACOSX/") or "/._" in normalized:
        return False
    return not any(normalized.startswith(prefix) for prefix in HASH_EXCLUDED_PREFIXES)


def compute_tree_hash(files: dict[str, bytes]) -> str:
    h = hashlib.sha256()
    for relpath in sorted(files.keys()):
        if not _should_include_in_tree(relpath):
            continue
        h.update(relpath.encode())
        h.update(b"\0")
        h.update(files[relpath])
    return f"sha256:{h.hexdigest()}"


def _normalize_zip_path(name: str) -> str | None:
    normalized = name.replace("\\", "/").lstrip("/")
    if not normalized or ".." in PurePosixPath(normalized).parts:
        return None
    return normalized


def _normalize_skill_zip_paths(files: dict[str, bytes]) -> dict[str, bytes]:
    filtered: dict[str, bytes] = {}
    for path, data in files.items():
        if path.startswith("__MACOSX/") or "/._" in path:
            continue
        filtered[path] = data

    skill_path = _find_skill_md(filtered)
    if not skill_path or skill_path == "skill/SKILL.md":
        return filtered

    prefix = skill_path[: -len("skill/SKILL.md")]
    rebased: dict[str, bytes] = {}
    for path, data in filtered.items():
        if path.startswith(prefix):
            rebased[path[len(prefix) :]] = data
    return rebased if rebased else filtered


def extract_zip_to_map(zip_bytes: bytes) -> dict[str, bytes]:
    if len(zip_bytes) > MAX_ZIP_BYTES:
        raise ValueError(f"Zip exceeds max size ({MAX_ZIP_BYTES} bytes)")
    files: dict[str, bytes] = {}
    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
        if len(zf.infolist()) > MAX_FILES:
            raise ValueError(f"Zip exceeds max file count ({MAX_FILES})")
        for info in zf.infolist():
            if info.is_dir():
                continue
            normalized = _normalize_zip_path(info.filename)
            if not normalized:
                raise ValueError(f"Unsafe zip path: {info.filename}")
            if normalized.startswith("__MACOSX/") or "/._" in normalized:
                continue
            data = zf.read(info)
            if len(data) > MAX_FILE_BYTES:
                raise ValueError(f"File too large: {normalized}")
            files[normalized] = data
    return _normalize_skill_zip_paths(files)


def _find_skill_md(files: dict[str, bytes]) -> str | None:
    if "skill/SKILL.md" in files:
        return "skill/SKILL.md"
    for key in files:
        if key.endswith("/skill/SKILL.md"):
            return key
    return None


def _default_harness() -> dict[str, Any]:
    return {
        "runtime": "builtin",
        "max_iterations": 12,
        "max_tool_calls_per_turn": 4,
        "timeout_seconds": 300,
    }


def _is_meta_skill(manifest: dict[str, Any]) -> bool:
    skill_id = manifest.get("id", "")
    kind = manifest.get("kind") or manifest.get("engine", {}).get("kind")
    return kind == "meta-skill" or (isinstance(skill_id, str) and skill_id.startswith("meta-skill."))


def _normalize_manifest(manifest: dict[str, Any], metadata: dict[str, Any], files: dict[str, bytes]) -> tuple[dict[str, Any], dict[str, Any]]:
    if "harness" not in manifest:
        manifest["harness"] = _default_harness()
    if _is_meta_skill(manifest):
        manifest.setdefault("evaluation_type", "agent")
        metadata.setdefault("evaluation_type", "agent")
        manifest.setdefault("manifest_version", "skillvault-1")
        manifest["harness"]["max_iterations"] = 16

    if "knowledge_dirs" not in manifest:
        engine_dirs = manifest.get("engine", {}).get("knowledge_dirs") or manifest.get(
            "toolchain", {}
        ).get("knowledge_dirs")
        if engine_dirs and any(k.startswith("skill/knowledge/") for k in files):
            manifest["knowledge_dirs"] = ["knowledge"]
        elif engine_dirs:
            manifest["knowledge_dirs"] = list(engine_dirs)
        elif any(k.startswith("skill/knowledge/") for k in files):
            manifest["knowledge_dirs"] = ["knowledge"]

    return manifest, metadata


def resolve_knowledge_dirs(manifest: dict[str, Any], files: dict[str, bytes]) -> list[str]:
    dirs = manifest.get("knowledge_dirs")
    if isinstance(dirs, list) and dirs:
        if any(k.startswith("skill/knowledge/") for k in files):
            return ["knowledge"]
        return [str(d) for d in dirs]
    if any(k.startswith("skill/knowledge/") for k in files):
        return ["knowledge"]
    return ["knowledge"]


def parse_skill_package(zip_bytes: bytes) -> SkillPackage:
    """Parse zip bytes into a SkillPackage. Legacy plain-text treated as minimal zip."""
    if zip_bytes[:2] != b"PK":
        text = zip_bytes.decode("utf-8")
        files = {
            "skill/SKILL.md": zip_bytes,
            "skill/metadata.json": json.dumps(
                {
                    "name": "legacy-skill",
                    "version": "0.1.0",
                    "category": "General",
                    "evaluation_type": "redaction",
                    "description": "",
                }
            ).encode(),
            "skill/manifest.json": json.dumps(
                {
                    "manifest_version": "skillvault-1",
                    "evaluation_type": "redaction",
                    "entrypoints": {"default": "SKILL.md"},
                    "harness": _default_harness(),
                }
            ).encode(),
        }
        return SkillPackage(
            zip_bytes=zip_bytes,
            skill_md=text,
            manifest=json.loads(files["skill/manifest.json"].decode()),
            metadata=json.loads(files["skill/metadata.json"].decode()),
            tree_hash=compute_tree_hash(files),
            harness_runtime="builtin",
        )

    files = extract_zip_to_map(zip_bytes)
    skill_path = _find_skill_md(files)
    if not skill_path:
        raise ValueError("Missing required file: skill/SKILL.md")
    skill_md = files[skill_path].decode("utf-8")
    if not skill_md.strip():
        raise ValueError("SKILL.md content is required")

    manifest: dict[str, Any] = {}
    if "skill/manifest.json" in files:
        manifest = json.loads(files["skill/manifest.json"].decode())

    metadata: dict[str, Any] = {}
    if "skill/metadata.json" in files:
        metadata = json.loads(files["skill/metadata.json"].decode())
    elif _is_meta_skill(manifest):
        metadata = {
            "name": manifest.get("display_name") or manifest.get("id", "agent-skill"),
            "version": "0.1.0",
            "category": "Research",
            "evaluation_type": "agent",
            "description": manifest.get("display_name", ""),
        }

    manifest, metadata = _normalize_manifest(manifest, metadata, files)
    harness_runtime = manifest.get("harness", {}).get("runtime", "builtin")
    tree_hash = compute_tree_hash(files)

    return SkillPackage(
        zip_bytes=zip_bytes,
        skill_md=skill_md,
        manifest=manifest,
        metadata=metadata,
        tree_hash=tree_hash,
        harness_runtime=harness_runtime,
    )


def compute_skill_hash(skill_bytes: bytes) -> str:
    pkg = parse_skill_package(skill_bytes)
    return pkg.tree_hash
