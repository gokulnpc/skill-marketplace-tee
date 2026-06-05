# TEE Runner

FastAPI evaluation server running inside the marketplace-hosted Phala TEE.

## Responsibilities

- Expose attestation and session metadata
- Generate ephemeral key pairs per evaluation session
- Receive and decrypt encrypted skill and buyer dataset
- Orchestrate baseline and with-skill evaluation
- Invoke verifier and leakage guard
- Sign and return TEE receipts

## Planned location

`services/tee-runner/`

## Topics

- [attestation.md](attestation.md) — TEE attestation endpoint and verification
- [encrypted-inputs.md](encrypted-inputs.md) — Encrypted skill and dataset handling
- [receipt-signing.md](receipt-signing.md) — Signed evaluation receipt format

## Must not expose

- Raw skill files
- Raw dataset contents
- Prompt logs or traces
- Debug shell or verifier internals

## Related

- [../TECHNICAL.md](../TECHNICAL.md)
- [../evaluation/](../evaluation/)
- [../model-server/](../model-server/)
