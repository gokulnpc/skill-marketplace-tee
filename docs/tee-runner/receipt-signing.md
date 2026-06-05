# Receipt Signing

The TEE runner produces a signed receipt after evaluation. Only the receipt (and approved output) leave the TEE.

## Receipt fields

| Field | Description |
| ----- | ----------- |
| `receipt_id` | Unique receipt identifier |
| `session_id` | Evaluation session ID |
| `skill_id` | Evaluated skill listing ID |
| `skill_hash` | SHA-256 of skill package |
| `runner_hash` | Runner image hash |
| `verifier_hash` | Verifier logic hash |
| `model_hash` | Model weights hash |
| `baseline_score` | Score without skill |
| `skill_score` | Score with skill |
| `uplift` | `skill_score - baseline_score` |
| `threshold` | Buyer-defined threshold |
| `passed` | Whether `skill_score >= threshold` |
| `attestation_ref` | Reference to attestation quote |
| `timestamp` | Evaluation completion time |
| `signature` | TEE-signed payload |

## Excluded from receipt

- Raw skill content
- Raw buyer dataset or transcripts
- Ground truth labels
- Prompt traces
- Verifier internal logic

## Settlement use

Marketplace API verifies receipt signature and `passed` flag before:

- Deducting buyer balance
- Crediting seller
- Issuing license

See [../settlement/threshold-settlement.md](../settlement/threshold-settlement.md).

## API sketch

```http
GET /v1/session/{session_id}/receipt
```

Returns signed receipt JSON. Marketplace stores audit copy.

## Related

- [attestation.md](attestation.md)
- [../evaluation/baseline-vs-skill.md](../evaluation/baseline-vs-skill.md)
