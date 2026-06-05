# Marketplace API

Orchestration layer coordinating sellers, buyers, TEE sessions, and settlement.

## Planned location

`apps/api/`

## Responsibilities

- User authentication
- Skill metadata and encrypted storage
- Skill validation pipeline
- TEE session lifecycle
- Buyer eligibility and balance checks
- Evaluation job queue
- Receipt verification
- Payment settlement
- License issuance
- Audit metadata storage

## Topics

- [skill-upload.md](skill-upload.md) — Seller upload and validation
- [evaluation-jobs.md](evaluation-jobs.md) — Job creation and status

## Related

- [../marketplace-ui/](../marketplace-ui/)
- [../tee-runner/](../tee-runner/)
- [../settlement/](../settlement/)
