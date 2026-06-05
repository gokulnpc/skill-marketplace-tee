import json
import re
import secrets
from typing import Literal

ChatRole = Literal["system", "user", "assistant"]


def _extract_transcript(messages: list[dict]) -> str:
    for message in reversed(messages):
        if message.get("role") == "user":
            return message.get("content", "")
    return ""


def _uses_skill(system_prompt: str) -> bool:
    markers = (
        "discreet meeting notes",
        "redact sensitive",
        "must_not_leak",
        "redaction skill",
    )
    lowered = system_prompt.lower()
    return any(marker in lowered for marker in markers)


def _parse_action_items(transcript: str) -> list[str]:
    items: list[str] = []
    patterns = [
        r"(?:I will|I'll)\s+(.+?)(?:\.|$)",
        r"Schedule\s+(.+?)(?:\.|$)",
    ]
    for pattern in patterns:
        for match in re.finditer(pattern, transcript, flags=re.IGNORECASE):
            text = match.group(1).strip().rstrip(".")
            if text and text not in items:
                items.append(text[0].upper() + text[1:] if text else text)
    if not items:
        items.append("Follow up on discussed action items.")
    return [f"{item}." if not item.endswith(".") else item for item in items]


def generate_mock_completion(messages: list[dict], model: str) -> dict:
    system = next((m.get("content", "") for m in messages if m.get("role") == "system"), "")
    transcript = _extract_transcript(messages)
    with_skill = _uses_skill(system)
    action_items = _parse_action_items(transcript)

    if with_skill:
        content = json.dumps(
            {
                "summary": "The team discussed next steps for a client security proposal.",
                "action_items": action_items,
                "decisions": [],
                "redacted_notes": "A sensitive client-related topic was discussed and omitted from the notes.",
            },
            indent=2,
        )
    else:
        speakers = re.findall(r"^([A-Za-z]+):", transcript, flags=re.MULTILINE)
        attribution = f" Participants: {', '.join(speakers)}." if speakers else ""
        content = json.dumps(
            {
                "summary": f"The team discussed client updates and next steps.{attribution}",
                "action_items": action_items,
                "decisions": [],
                "redacted_notes": transcript[:120] + ("..." if len(transcript) > 120 else ""),
            },
            indent=2,
        )

    return {
        "id": f"chatcmpl-{secrets.token_hex(12)}",
        "object": "chat.completion",
        "model": model,
        "choices": [
            {
                "index": 0,
                "message": {"role": "assistant", "content": content},
                "finish_reason": "stop",
            }
        ],
        "usage": {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0},
    }
