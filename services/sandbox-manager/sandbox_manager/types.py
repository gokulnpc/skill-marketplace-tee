"""Shared sandbox types."""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


@dataclass
class SessionSandbox:
    session_id: str
    root: Path
    manifest: dict[str, Any] = field(default_factory=dict)
    model_proxy_url: str = ""
    session_token: str = ""
