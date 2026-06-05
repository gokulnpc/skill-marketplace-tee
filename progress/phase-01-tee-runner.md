# Phase 1: Core TEE Runner

See [docs/IMPLEMENTATION.md](../docs/IMPLEMENTATION.md#phase-1-core-tee-runner).

| Task | Status | Notes | Blockers |
| ---- | ------ | ----- | -------- |
| Scaffold FastAPI app in `services/tee-runner/` | done | pyproject.toml, routes, README | |
| Implement attestation endpoint (quote, hashes, ephemeral key) | done | `GET /v1/sessions/{id}/attestation` | |
| Implement ephemeral key generation per session | done | RSA-2048 per session via mock/dstack adapter | |
| Implement encrypted input receiver (skill + dataset blobs) | done | Hybrid RSA-OAEP + AES-GCM envelope | |
| Implement receipt signer | done | Ed25519 signed receipt + finalize endpoint | |

## Run locally

```bash
cd services/tee-runner
source .venv/bin/activate
uvicorn tee_runner.main:app --reload --port 8080
pytest
```

## Mode

Default `RUNNER_MODE=mock`. Set `RUNNER_MODE=dstack` when dstack-sdk/simulator is available.
