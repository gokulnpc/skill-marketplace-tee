# Encrypted Inputs

Skill and buyer dataset arrive at the TEE as encrypted blobs. Plaintext exists only inside the TEE after session-key decryption.

## Input types

| Input | Source | Encryption |
| ----- | ------ | ---------- |
| Seller skill | Marketplace API | Encrypted to TEE session ephemeral public key |
| Buyer dataset | Buyer CLI | Encrypted to same session ephemeral public key |

## Skill package handling

1. Marketplace stores skill encrypted at rest.
2. On eval session start, API re-encrypts or forwards skill blob to TEE session key.
3. TEE runner decrypts internally; skill never returned to buyer.

## Buyer dataset handling

1. Buyer CLI reads local dataset from disk.
2. CLI encrypts entire bundle to TEE `ephemeral_public_key`.
3. Encrypted blob sent via API to TEE runner.
4. TEE decrypts internally; dataset never visible to seller or marketplace.

## Bundle structure (plaintext, inside TEE only)

```text
decrypted_skill/          # Seller skill package
decrypted_dataset/        # Buyer eval dataset
  transcripts/
  ground_truth/
  eval_config.json
```

## Security notes

- Treat buyer dataset as adversarial (prompt injection attempts).
- Erase decrypted material from memory after evaluation.
- No logging of plaintext skill or dataset content.

## Related

- [attestation.md](attestation.md)
- [../buyer-cli/dataset-format.md](../buyer-cli/dataset-format.md)
- [../marketplace-api/skill-upload.md](../marketplace-api/skill-upload.md)
