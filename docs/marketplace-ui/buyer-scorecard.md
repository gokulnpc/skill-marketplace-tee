# Buyer Scorecard

Post-evaluation UI showing results, proof, and purchase status.

## Scorecard sections

### Scores

| Field | Description |
| ----- | ----------- |
| Baseline score | Performance without skill |
| Skill score | Performance with skill |
| Uplift | Difference |
| Threshold | Buyer commitment |
| Result | Pass / Fail |

### TEE proof card

- Attestation quote summary (verifiable link or copy)
- Runner hash
- Verifier hash
- Model hash
- Session ID and timestamp
- Receipt signature verification status

### Sample outputs (optional)

Redacted example outputs from evaluation — only leakage-guard-approved content.

### Payment status

- **Pass:** Charged, seller credited, license issued
- **Fail:** Not charged, no license

### License status

If passed: license ID, skill ID, valid for future TEE executions (not raw skill download).

## Audit receipt viewer

Expandable view of signed receipt JSON with signature verification button.

## Related

- [../tee-runner/receipt-signing.md](../tee-runner/receipt-signing.md)
- [../settlement/threshold-settlement.md](../settlement/threshold-settlement.md)
- [../evaluation/baseline-vs-skill.md](../evaluation/baseline-vs-skill.md)
