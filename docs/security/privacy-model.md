# Privacy Model

What stays private, what is revealed, and trust boundaries.

## Guarantees

| Data | Seller | Buyer | Marketplace | Model provider |
| ---- | ------ | ----- | ----------- | -------------- |
| Raw skill | Hidden | Hidden | Encrypted at rest only | N/A |
| Buyer dataset | Hidden | Local until encrypted | Never plaintext | Hidden |
| Ground truth | Hidden | Hidden | Never plaintext | Hidden |
| Model prompts | Hidden | Hidden | Hidden | Hidden (local model) |
| Scores + receipt | Visible (aggregate) | Visible | Visible (audit) | N/A |
| Approved output samples | Hidden | Visible (redacted) | Hidden | Hidden |

## Encryption boundaries

1. **Buyer machine → TEE:** Dataset encrypted to TEE ephemeral public key after attestation verification.
2. **Marketplace → TEE:** Skill encrypted to same session key.
3. **Inside TEE:** Decryption, inference, verification, leakage check.
4. **TEE → outside:** Signed receipt and leakage-guard-approved outputs only.

## Threat considerations

- **Prompt injection in buyer data:** Leakage guard + adversarial dataset handling.
- **Skill exfiltration via output:** Leakage guard blocks skill content in responses.
- **Fake TEE:** Buyer CLI must verify attestation before encrypting.
- **Marketplace insider:** No access to buyer plaintext; audit logs contain receipts only.

## Post-execution

- Erase decrypted skill and dataset from TEE memory after evaluation.
- No persistent plaintext storage of buyer data in marketplace.

## Non-goals affecting privacy (MVP)

- External LLM API mode disabled — would leak buyer data to model provider.
- NEAR AI mode not in MVP — would add additional trust boundary.

## Related

- [../tee-runner/encrypted-inputs.md](../tee-runner/encrypted-inputs.md)
- [../evaluation/leakage-guard.md](../evaluation/leakage-guard.md)
- [../buyer-cli/encryption-flow.md](../buyer-cli/encryption-flow.md)
