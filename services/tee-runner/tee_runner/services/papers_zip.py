"""Buyer papers zip dataset handling."""

from __future__ import annotations

import hashlib
import io
import zipfile
from pathlib import PurePosixPath

MAX_ZIP_BYTES = 52_428_800
MAX_FILES = 500
MAX_FILE_BYTES = 10_485_760
ALLOWED_EXTENSIONS = {".pdf", ".md", ".txt", ".markdown"}

SLIDE_TASK_PROMPT = (
    "Create an 8–12 slide conference talk deck as slides.pptx from the buyer papers "
    "in dataset/papers/. Apply Ari presentation style from the skill. "
    "Use read_file, list_dir, grep_knowledge, list_papers, read_paper, and "
    "generate_slides_pptx when ready."
)


def is_papers_zip(data: bytes) -> bool:
    return len(data) >= 4 and data[:2] == b"PK"


def _normalize_path(name: str) -> str | None:
    normalized = name.replace("\\", "/").lstrip("/")
    if not normalized or normalized.startswith("__MACOSX/") or "/._" in normalized:
        return None
    if ".." in PurePosixPath(normalized).parts:
        return None
    return normalized


def extract_papers_zip(data: bytes) -> dict[str, bytes]:
    if len(data) > MAX_ZIP_BYTES:
        raise ValueError(f"Papers zip exceeds max size ({MAX_ZIP_BYTES} bytes)")
    files: dict[str, bytes] = {}
    with zipfile.ZipFile(io.BytesIO(data)) as zf:
        if len(zf.infolist()) > MAX_FILES:
            raise ValueError(f"Papers zip exceeds max file count ({MAX_FILES})")
        for info in zf.infolist():
            if info.is_dir():
                continue
            normalized = _normalize_path(info.filename)
            if not normalized:
                continue
            ext = PurePosixPath(normalized).suffix.lower()
            if ext and ext not in ALLOWED_EXTENSIONS:
                continue
            payload = zf.read(info)
            if len(payload) > MAX_FILE_BYTES:
                raise ValueError(f"Paper file too large: {normalized}")
            files[normalized] = payload
    if not files:
        raise ValueError("Papers zip contains no supported files (.pdf, .md, .txt)")
    return files


def papers_zip_commitment(data: bytes) -> str:
    return f"sha256:{hashlib.sha256(data).hexdigest()}"


def papers_zip_transcripts(_data: bytes) -> list[dict[str, str]]:
    return [{"id": "slides_from_papers", "content": SLIDE_TASK_PROMPT}]
