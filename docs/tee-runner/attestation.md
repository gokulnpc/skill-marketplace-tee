# Attestation

The TEE runner exposes attestation data so the buyer CLI can verify the execution environment before encrypting private data.

## Attestation response fields

| Field | Description |
| ----- | ----------- |
| `attestation_quote` | Phala TEE attestation quote |
| `runner_hash` | Hash of runner image/code |
| `verifier_hash` | Hash of verifier logic |
| `model_hash` | Hash of loaded model weights |
| `ephemeral_public_key` | Session public key for encrypting buyer dataset |
| `session_id` | Unique evaluation session identifier |
| `timestamp` | Quote generation time |

## Buyer verification steps

1. Fetch attestation from TEE runner endpoint.
2. Verify Phala attestation quote against expected policy.
3. Confirm `runner_hash` matches published expected hash.
4. Confirm `verifier_hash` matches published expected hash.
5. Confirm `model_hash` matches expected model for this listing.
6. Only then encrypt dataset to `ephemeral_public_key`.

## API sketch

```http
GET /v1/session/{session_id}/attestation
```

```json
{
  "attestation_quote": "...",
  "runner_hash": "sha256:...",
  "verifier_hash": "sha256:...",
  "model_hash": "sha256:...",
  "ephemeral_public_key": "-----BEGIN PUBLIC KEY-----...",
  "session_id": "sess_abc123",
  "timestamp": "2026-06-05T12:00:00Z"
}
```

## Related

- [encrypted-inputs.md](encrypted-inputs.md)
- [../buyer-cli/encryption-flow.md](../buyer-cli/encryption-flow.md)
- [../security/privacy-model.md](../security/privacy-model.md)
