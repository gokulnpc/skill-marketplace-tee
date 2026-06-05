# Evaluation Jobs

API orchestration for buyer evaluation sessions.

## Job lifecycle

```text
created → attestation_ready → dataset_received → running → completed | failed
```

## Create job

```http
POST /v1/evaluations
```

```json
{
  "skill_id": "skill_discreet_meeting_notes",
  "threshold": 0.85,
  "buyer_id": "buyer_123"
}
```

Pre-checks:

- Buyer authenticated
- Sufficient simulated balance (full price reserved or available)
- Skill listing published and compatible

## Session provisioning

1. API starts Phala TEE runner session
2. TEE returns attestation bundle
3. API stores session metadata and exposes attestation to buyer CLI

## Dataset submission

```http
POST /v1/evaluations/{job_id}/dataset
```

Body: encrypted dataset blob from buyer CLI.

API forwards encrypted skill (from registry) and dataset to TEE.

## Status and results

```http
GET /v1/evaluations/{job_id}
```

Returns job status. On completion:

- Signed receipt
- Scorecard (baseline, skill score, uplift, passed)
- Settlement status (pending → settled)

## Receipt verification

API verifies TEE receipt signature before triggering settlement.

## Related

- [../buyer-cli/encryption-flow.md](../buyer-cli/encryption-flow.md)
- [../tee-runner/receipt-signing.md](../tee-runner/receipt-signing.md)
- [../settlement/threshold-settlement.md](../settlement/threshold-settlement.md)
