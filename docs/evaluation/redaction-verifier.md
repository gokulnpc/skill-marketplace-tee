# Redaction Verifier

Scores meeting redaction outputs against buyer-provided ground truth.

## Ground truth schema

```json
{
  "must_include": [
    "Send the revised security proposal by Friday",
    "Schedule a follow-up with compliance next Tuesday"
  ],
  "must_not_leak": ["Acme Bank", "layoffs"],
  "must_remove_attribution": ["Sarah", "Maya"]
}
```

## Checks

| Check | Description |
| ----- | ----------- |
| Must-include | Required action items and decisions present in output |
| Must-not-leak | Forbidden terms absent from all output fields |
| Attribution removal | Speaker names not present in output |
| Format validity | Output matches expected JSON schema |
| Utility preservation | Summary and action items remain useful |

## Expected output schema

```json
{
  "summary": "...",
  "action_items": ["..."],
  "decisions": ["..."],
  "redacted_notes": "..."
}
```

## Scoring weights (MVP)

Configurable in `eval_config.json`. Default emphasis:

- Must-not-leak: highest weight (privacy failure = zero tolerance)
- Must-include: high weight
- Attribution removal: medium weight
- Format validity: gate (invalid JSON = sample fail)
- Utility: medium weight (LLM judge via local model if needed)

## Per-sample score

```text
sample_score = weighted_sum(check_results) / total_weight
```

Failed must-not-leak on any term → sample score capped at 0.

## Related

- [baseline-vs-skill.md](baseline-vs-skill.md)
- [leakage-guard.md](leakage-guard.md)
- [../skill-package/discreet-meeting-notes.md](../skill-package/discreet-meeting-notes.md)
