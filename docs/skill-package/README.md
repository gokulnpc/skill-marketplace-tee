# Skill Package

Format for seller-uploaded private AI agent skills.

## Directory structure

```text
skill/
  SKILL.md          # Primary instructions (required)
  metadata.json     # Name, version, category, eval type (required)
  scripts/          # Optional helper scripts
  examples/         # Optional few-shot examples
```

## metadata.json fields

| Field | Description |
| ----- | ----------- |
| `name` | Skill display name |
| `version` | Sem semver string |
| `category` | e.g. redaction, summarization |
| `evaluation_type` | e.g. redaction, deterministic, subjective |
| `description` | Short summary for listing |

## Validation checks (marketplace)

- Required files exist
- Metadata schema valid
- No obvious embedded secrets
- No malicious scripts
- Skill does not instruct model to reveal hidden prompts
- Compatible with listing evaluation type

## Storage

- `skill_hash = sha256(skill_package)`
- Encrypted at rest in object storage
- Decrypted only inside TEE during evaluation

## Topics

- [discreet-meeting-notes.md](discreet-meeting-notes.md) — MVP skill specification
- [portable-agent.md](portable-agent.md) — Zip-based agent packages (skillvault-1)

## Related

- [../marketplace-api/skill-upload.md](../marketplace-api/skill-upload.md)
- [../evaluation/](../evaluation/)
