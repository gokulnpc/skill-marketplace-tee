# Skill Upload

Seller workflow for submitting private skills to the marketplace.

## Upload flow

1. Seller authenticates
2. Seller uploads skill package (zip or directory)
3. API validates package (see [../skill-package/README.md](../skill-package/README.md))
4. On success: compute `skill_hash`, encrypt, store in object storage
5. Seller completes listing metadata (price, category, trial policy)
6. Listing published

## Validation failures

Return specific rejection reasons:

- Missing required files
- Invalid metadata schema
- Incompatible evaluation type
- Suspicious script content
- Skill instructs prompt revelation

## Registry record

| Field | Description |
| ----- | ----------- |
| `skill_id` | Unique listing ID |
| `skill_hash` | SHA-256 of package |
| `seller_id` | Owner account |
| `price` | Listing price |
| `evaluation_type` | e.g. redaction |
| `status` | draft, published, rejected |
| `storage_ref` | Encrypted blob location |

## Encryption

Skill encrypted at rest. Re-encrypted or forwarded to TEE session key at evaluation time.

## Related

- [../skill-package/README.md](../skill-package/README.md)
- [../marketplace-ui/seller-flows.md](../marketplace-ui/seller-flows.md)
