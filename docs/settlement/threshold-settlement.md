# Threshold Settlement

Payment logic tied to TEE evaluation receipt.

## Rules

```text
if skill_score >= threshold:
  deduct buyer balance (full listing price)
  credit seller balance
  issue license record
else:
  do not charge buyer
  do not issue license
  release any reserved balance
```

## Preconditions

- TEE receipt signature verified by marketplace API
- Receipt `passed` flag matches score vs threshold
- Receipt `skill_id` and `skill_hash` match listing
- Job not already settled (idempotency)

## Balance model (MVP)

| Account | Operations |
| ------- | ---------- |
| Buyer | Deposit credits (simulated), reserve on eval start, deduct on pass |
| Seller | Credit on buyer pass |

## License record

On pass, create license:

| Field | Description |
| ----- | ----------- |
| `license_id` | Unique ID |
| `buyer_id` | Purchaser |
| `skill_id` | Licensed skill |
| `receipt_id` | TEE receipt reference |
| `issued_at` | Timestamp |

License grants future TEE execution rights — not raw skill download.

## Future: blockchain escrow

```text
Buyer locks full price in escrow.
TEE signs evaluation result.
Smart contract releases payment if threshold passes.
Smart contract refunds buyer if threshold fails.
```

Not in MVP scope.

## Related

- [../marketplace-api/evaluation-jobs.md](../marketplace-api/evaluation-jobs.md)
- [../marketplace-ui/buyer-scorecard.md](../marketplace-ui/buyer-scorecard.md)
