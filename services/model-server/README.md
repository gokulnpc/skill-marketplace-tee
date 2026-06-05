# Model Server

OpenAI-compatible chat completions server for SkillVault TEE. Runs inside the TEE alongside the evaluation runner.

## Modes

| Mode | Env | Description |
| ---- | --- | ----------- |
| `mock` | `MODEL_MODE=mock` (default) | Deterministic responses for dev/testing |
| `ollama` | `MODEL_MODE=ollama` | Proxy to local Ollama API (future) |

## Setup

```bash
cd services/model-server
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
```

## Run

```bash
uvicorn model_server.main:app --reload --port 8000
```

## Test

```bash
pytest
```

## API

```http
POST /v1/chat/completions
GET  /health
GET  /v1/models
```

Default model: `llama-3.1-8b-instruct`
