# Phase 5: Payment and License Simulation

See [docs/IMPLEMENTATION.md](../docs/IMPLEMENTATION.md#phase-5-payment-and-license-simulation).

| Task | Status | Notes | Blockers |
| ---- | ------ | ----- | -------- |
| Implement internal balance accounts (buyer/seller) | done | `MarketplaceStore` buyer/seller balances + reservations | Phase 4 |
| Implement threshold pass/fail settlement logic | done | `settlement.ts` — receipt verify + charge on pass | |
| Implement seller credit on successful purchase | done | Credits seller on verified pass receipt | |
| Implement buyer license record | done | License issued on pass; API + web scorecard + CLI | |

## Deliverables

- `apps/api/src/settlement.ts` — receipt verification and settlement
- `apps/api/src/routes.ts` — seller balance, licenses, auto-settle on dataset submit
- `apps/api/src/settlement.test.ts` — pass/fail/invalid receipt tests
- `apps/web/app/evaluations/[id]/page.tsx` — Payment & License scorecard section
- `packages/cli/src/index.ts` — payment and license in eval output

## Tests

```bash
pnpm --filter @skillvault/api test
```

7 tests passing (store, settlement, skill-validator).
