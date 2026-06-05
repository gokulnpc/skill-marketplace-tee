# TEE Runner

FastAPI evaluation server for SkillVault TEE. Phase 1 implements session lifecycle, attestation, encrypted inputs, and receipt signing.

## Modes

| Mode | Env | Description |
| ---- | --- | ----------- |
| `mock` | `RUNNER_MODE=mock` (default) | Local dev; synthetic attestation and RSA/AES crypto |
| `dstack` | `RUNNER_MODE=dstack` | Uses dstack SDK via simulator or `/var/run/dstack.sock` |

## Setup

```bash
cd services/tee-runner
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
```

## Run

```bash
uvicorn tee_runner.main:app --reload --port 8080
```

## Test

```bash
pytest
```

## API

| Method | Path | Description |
| ------ | ---- | ----------- |
| POST | `/v1/sessions` | Create evaluation session |
| GET | `/v1/sessions/{session_id}` | Session status |
| GET | `/v1/sessions/{session_id}/attestation` | Attestation bundle |
| POST | `/v1/sessions/{session_id}/inputs/skill` | Submit encrypted skill |
| POST | `/v1/sessions/{session_id}/inputs/dataset` | Submit encrypted dataset |
| POST | `/v1/sessions/{session_id}/inference` | Run baseline + with-skill model inference |
| POST | `/v1/sessions/{session_id}/evaluate` | Score outputs with verifier + leakage guard |
| POST | `/v1/sessions/{session_id}/finalize` | Sign receipt (auto-scores if evaluated) |
| GET | `/v1/sessions/{session_id}/receipt` | Fetch signed receipt |

See [docs/tee-runner/](../../docs/tee-runner/).
