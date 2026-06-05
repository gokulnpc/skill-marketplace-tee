# Discreet Meeting Notes

MVP skill for meeting transcript redaction and note generation.

## Purpose

Generate useful meeting notes while removing sensitive topics and speaker attribution.

## Outputs

- Summary
- Action items
- Decisions
- Redacted notes
- Confidentiality-safe version

## Redaction focus

Editorial redaction — not just PII removal:

- Sensitive business topics
- Confidential client context
- Speaker attribution
- Planted secrets (canaries for leakage detection)

Preserves useful meeting logistics: deadlines, action owners (without names), decisions.

## Example input transcript

```text
Sarah: The client is Acme Bank.
Maya: Do not mention that Acme Bank is considering layoffs.
Ravi: I will send the revised security proposal by Friday.
Maya: Schedule a follow-up with compliance next Tuesday.
```

## Example expected output

```json
{
  "summary": "The team discussed next steps for a client security proposal.",
  "action_items": [
    "Send the revised security proposal by Friday.",
    "Schedule a follow-up with the compliance team next Tuesday."
  ],
  "redacted_notes": "A sensitive client-related topic was discussed and omitted from the notes."
}
```

## Ground truth pairing

Each transcript pairs with a ground truth JSON. See [../evaluation/redaction-verifier.md](../evaluation/redaction-verifier.md).

## Planned location

`skills/discreet-meeting-notes/`

## Related

- [README.md](README.md)
- [../buyer-cli/dataset-format.md](../buyer-cli/dataset-format.md)
