# Phase 6: Demo Polish

See [docs/IMPLEMENTATION.md](../docs/IMPLEMENTATION.md#phase-6-demo-polish).

| Task | Status | Notes | Blockers |
| ---- | ------ | ----- | -------- |
| Build TEE proof card UI component | done | `TeeProofCard` with attestation quote, hashes | Phase 5 |
| Polish scorecard (baseline, skill score, uplift) | done | `ScorePanel` with % formatting and pass badge | |
| Add payment status display | done | `PaymentLicenseCard` with charged/not charged badges | |
| Add license status display | done | License issued / not issued badges | |
| Build audit receipt viewer and validate end-to-end demo | done | `AuditReceiptViewer` + `scripts/demo-e2e.sh` | |

## Deliverables

- `apps/web/components/scorecard/` — ScorePanel, TeeProofCard, PaymentLicenseCard, AuditReceiptViewer
- `packages/shared/src/receipt.ts` — canonical payload + Ed25519 verify helpers
- `GET /v1/signing-public-key` and `GET /v1/sessions/{id}/receipt/verify` on tee-runner
- `GET /v1/evaluations/{jobId}/receipt/verify` on marketplace API
- `scripts/demo-e2e.sh` — PRD §17 end-to-end validation

## Demo

Start all services, then:

```bash
pnpm demo
```

Requires model-server (:8000), tee-runner (:8080), and marketplace API (:3001).
