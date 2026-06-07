"""Session debug logging (agent instrumentation)."""

from __future__ import annotations

import json
import time
from pathlib import Path

DEBUG_LOG = Path(
    "/Users/gokuleshwarannarayanan/Documents/Repositories/Hackathons/skill-mp/.cursor/debug-563348.log"
)


def agent_log(
    location: str,
    message: str,
    data: dict,
    hypothesis_id: str,
    *,
    run_id: str = "pre-fix",
) -> None:
    payload = {
        "sessionId": "563348",
        "location": location,
        "message": message,
        "data": data,
        "hypothesisId": hypothesis_id,
        "runId": run_id,
        "timestamp": int(time.time() * 1000),
    }
    try:
        with DEBUG_LOG.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(payload, default=str) + "\n")
    except Exception:
        pass
