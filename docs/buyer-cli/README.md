# Buyer CLI

Local connector running on the buyer's machine. Reads private datasets, verifies TEE attestation, encrypts data to the TEE, and displays evaluation results.

## Planned location

`packages/cli/`

## Example usage

```bash
skillvault eval \
  --skill discreet-meeting-notes \
  --dataset ./buyer_eval_dataset \
  --threshold 0.85
```

## Responsibilities

1. Read local evaluation dataset
2. Fetch and verify TEE attestation (runner, verifier, model hashes)
3. Encrypt dataset to TEE ephemeral public key
4. Submit encrypted bundle via marketplace API
5. Poll for evaluation completion
6. Display scorecard and receipt verification status

## Implementation options (MVP: CLI)

- CLI (chosen for MVP)
- Browser extension (future)
- Desktop app (future)
- Local web helper (future)

## Topics

- [dataset-format.md](dataset-format.md) — Local dataset layout
- [encryption-flow.md](encryption-flow.md) — Attestation verify and encrypt steps

## Related

- [../tee-runner/attestation.md](../tee-runner/attestation.md)
- [../marketplace-api/evaluation-jobs.md](../marketplace-api/evaluation-jobs.md)
