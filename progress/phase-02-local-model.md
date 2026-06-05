# Phase 2: Local Model Inside TEE

See [docs/IMPLEMENTATION.md](../docs/IMPLEMENTATION.md#phase-2-local-model-inside-tee).

| Task | Status | Notes | Blockers |
| ---- | ------ | ----- | -------- |
| Scaffold model server in `services/model-server/` | done | FastAPI mock mode on port 8000 | |
| Expose OpenAI-compatible `localhost:8000/v1/chat/completions` | done | See [docs/model-server/openai-compatible-api.md](../docs/model-server/openai-compatible-api.md) | |
| Wire baseline inference call from tee-runner | done | `POST /v1/sessions/{id}/inference` | |
| Wire with-skill inference call from tee-runner | done | Skill content injected into system prompt | |

## Run locally

Terminal 1 — model server:

```bash
cd services/model-server
source .venv/bin/activate
uvicorn model_server.main:app --reload --port 8000
```

Terminal 2 — tee-runner:

```bash
cd services/tee-runner
source .venv/bin/activate
uvicorn tee_runner.main:app --reload --port 8080
```

## Inference flow

1. Create session and submit encrypted skill + dataset (Phase 1).
2. `POST /v1/sessions/{id}/inference` — runs baseline and with-skill calls per transcript.
3. `POST /v1/sessions/{id}/finalize` — sign receipt (scores still manual until Phase 3 verifier).
