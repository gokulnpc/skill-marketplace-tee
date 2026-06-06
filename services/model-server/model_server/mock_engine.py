import json
import re
import secrets
from typing import Any, Literal

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


def _uses_agent_skill(system_prompt: str) -> bool:
    markers = (
        "autonomous research agent",
        "grep_knowledge",
        "skill knowledge base",
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


def _tool_results_present(messages: list[dict]) -> bool:
    return any(message.get("role") == "tool" for message in messages)


def _is_slide_task(transcript: str) -> bool:
    lowered = transcript.lower()
    return "slides.pptx" in lowered or "slide deck" in lowered or "slide" in lowered


def _slides_tool_completed(messages: list[dict]) -> bool:
    for message in messages:
        if message.get("role") != "tool":
            continue
        content = str(message.get("content", ""))
        if "slides.pptx" in content and "size" in content:
            return True
    return False


def _agent_final_content(transcript: str, *, slide_task: bool = False) -> str:
    topic = transcript.strip()[:120] or "the research question"
    if slide_task:
        return json.dumps(
            {
                "summary": "Slide deck generated with 10 slides from buyer research papers.",
                "analysis": (
                    "The talk covers problem framing, mechanism design, and evidence from "
                    "the uploaded papers using Ari presentation style."
                ),
                "artifact": "slides.pptx",
            },
            indent=2,
        )
    return json.dumps(
        {
            "summary": f"Structured analysis of: {topic}",
            "analysis": (
                "After consulting the skill knowledge base, the idea intersects with "
                "MEV, ordering fairness, and private transaction markets. Incentive alignment "
                "and verifiable ordering commitments are the main design levers."
            ),
            "recommendations": [
                "Model validator incentives under private ordering sales",
                "Compare with encrypted mempool and commit-reveal designs",
            ],
        },
        indent=2,
    )


def generate_mock_agent_completion(messages: list[dict], model: str) -> dict:
    system = next((m.get("content", "") for m in messages if m.get("role") == "system"), "")
    transcript = _extract_transcript(messages)
    slide_task = _is_slide_task(transcript)

    if not _tool_results_present(messages):
        tool_calls = [
            {
                "id": "call_list",
                "type": "function",
                "function": {"name": "list_dir", "arguments": "{}"},
            },
        ]
        if slide_task:
            tool_calls.append(
                {
                    "id": "call_papers",
                    "type": "function",
                    "function": {"name": "list_papers", "arguments": "{}"},
                }
            )
        else:
            tool_calls.append(
                {
                    "id": "call_grep",
                    "type": "function",
                    "function": {
                        "name": "grep_knowledge",
                        "arguments": json.dumps({"pattern": "validator|ordering|MEV"}),
                    },
                }
            )
        return {
            "id": f"chatcmpl-{secrets.token_hex(12)}",
            "object": "chat.completion",
            "model": model,
            "choices": [
                {
                    "index": 0,
                    "message": {"role": "assistant", "content": None, "tool_calls": tool_calls},
                    "finish_reason": "tool_calls",
                }
            ],
            "usage": {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0},
        }

    if slide_task and not _slides_tool_completed(messages):
        return {
            "id": f"chatcmpl-{secrets.token_hex(12)}",
            "object": "chat.completion",
            "model": model,
            "choices": [
                {
                    "index": 0,
                    "message": {
                        "role": "assistant",
                        "content": None,
                        "tool_calls": [
                            {
                                "id": "call_slides",
                                "type": "function",
                                "function": {
                                    "name": "generate_slides_pptx",
                                    "arguments": json.dumps(
                                        {
                                            "title": "Research Talk",
                                            "slides": [
                                                {"title": "Problem", "bullets": ["Motivation"]},
                                                {"title": "Approach", "bullets": ["Mechanism"]},
                                                {"title": "Takeaways", "bullets": ["Summary"]},
                                            ],
                                        }
                                    ),
                                },
                            }
                        ],
                    },
                    "finish_reason": "tool_calls",
                }
            ],
            "usage": {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0},
        }

    content = _agent_final_content(transcript, slide_task=slide_task)
    if not _uses_agent_skill(system) and "autonomous research agent" not in system.lower():
        content = json.dumps(
            {
                "summary": "Generic research response without private skill access.",
                "analysis": transcript[:200],
                "recommendations": [],
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


def generate_mock_completion(
    messages: list[dict],
    model: str,
    tools: list[dict[str, Any]] | None = None,
) -> dict:
    if tools:
        return generate_mock_agent_completion(messages, model)

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
