#!/usr/bin/env bash
# Runs inside Phala CVM (python:3.12-slim). No local build context required.
set -euo pipefail

REPO="${SKILLVAULT_REPO:-https://github.com/gokulnpc/skill-marketplace-tee.git}"
REF="${SKILLVAULT_REF:-main}"
MODEL_PORT="${MODEL_PORT:-8000}"
TEE_PORT="${TEE_PORT:-8080}"
OLLAMA_BASE_URL="${OLLAMA_BASE_URL:-http://ollama:11434}"
MODEL_NAME="${MODEL_NAME:-llama3.1:8b}"

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y --no-install-recommends git curl ca-certificates

pip install --upgrade pip
pip install \
  "git+${REPO}@${REF}#subdirectory=services/model-server" \
  "tee-runner[dstack] @ git+${REPO}@${REF}#subdirectory=services/tee-runner"

export PYTHONPATH="/usr/local/lib/python3.12/site-packages:${PYTHONPATH:-}"

echo "Waiting for Ollama at ${OLLAMA_BASE_URL}..."
python - <<'PY'
import os
from model_server.ollama_engine import wait_for_ollama
wait_for_ollama(os.environ["OLLAMA_BASE_URL"])
print("Ollama is ready")
PY

if [[ "${OLLAMA_PULL_ON_START:-true}" == "true" ]]; then
  echo "Pulling model ${MODEL_NAME}..."
  python - <<'PY'
import os
from model_server.ollama_engine import pull_model
pull_model(os.environ["OLLAMA_BASE_URL"], os.environ["MODEL_NAME"])
print("Model pull complete")
PY
fi

echo "Starting model-server on :${MODEL_PORT}..."
uvicorn model_server.main:app --host 127.0.0.1 --port "${MODEL_PORT}" &
MODEL_PID=$!

echo "Starting tee-runner on :${TEE_PORT} (RUNNER_MODE=${RUNNER_MODE:-dstack})..."
uvicorn tee_runner.main:app --host 0.0.0.0 --port "${TEE_PORT}" &
TEE_PID=$!

trap 'kill ${MODEL_PID} ${TEE_PID} 2>/dev/null || true' EXIT
wait "${TEE_PID}"
