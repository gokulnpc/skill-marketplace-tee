# Buyer Dataset Format

Local directory structure for private evaluation datasets.

## Layout

```text
buyer_eval_dataset/
  transcripts/
    meeting_001.txt
    meeting_002.txt
  ground_truth/
    meeting_001.json
    meeting_002.json
  eval_config.json
```

## transcripts/

Plain-text meeting transcripts. Filenames must match ground truth files (e.g. `meeting_001.txt` ↔ `meeting_001.json`).

Treat as adversarial — may contain prompt injection attempts.

## ground_truth/

Per-transcript JSON with verification rules:

```json
{
  "must_include": ["..."],
  "must_not_leak": ["..."],
  "must_remove_attribution": ["..."]
}
```

Ground truth stays encrypted to TEE; never sent to seller or marketplace in plaintext.

## eval_config.json

Optional scoring configuration:

```json
{
  "weights": {
    "must_not_leak": 0.4,
    "must_include": 0.3,
    "attribution_removal": 0.15,
    "utility": 0.15
  },
  "sample_limit": null
}
```

## CLI validation

Before encryption, CLI should verify:

- Required directories exist
- Transcript/ground-truth pairs match
- Ground truth JSON schema valid
- Threshold provided and in range [0, 1]

## Related

- [encryption-flow.md](encryption-flow.md)
- [../evaluation/redaction-verifier.md](../evaluation/redaction-verifier.md)
- [../skill-package/discreet-meeting-notes.md](../skill-package/discreet-meeting-notes.md)
