BASELINE_SYSTEM_PROMPT = """Summarize this meeting transcript. Include action items and decisions.
Do not include speaker names in the summary, but preserve factual details from the transcript."""

WITH_SKILL_SYSTEM_TEMPLATE = """You are running the seller's private skill inside the TEE.

Skill instructions:
{skill_content}

Follow the skill exactly. Output valid JSON with keys:
summary, action_items, decisions, redacted_notes.
Redact sensitive topics and remove speaker attribution."""


def build_baseline_messages(transcript: str) -> list[dict[str, str]]:
    return [
        {"role": "system", "content": BASELINE_SYSTEM_PROMPT},
        {"role": "user", "content": transcript},
    ]


def build_with_skill_messages(skill_content: str, transcript: str) -> list[dict[str, str]]:
    system = WITH_SKILL_SYSTEM_TEMPLATE.format(skill_content=skill_content.strip())
    return [
        {"role": "system", "content": system},
        {"role": "user", "content": transcript},
    ]
