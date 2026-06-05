#!/usr/bin/env bash
# Runs inside Phala CVM (python:3.12-slim). No local build context required.
set -euo pipefail

REPO="${SKILLVAULT_REPO:-https://github.com/gokulnpc/skill-marketplace-tee.git}"
REF="${SKILLVAULT_REF:-main}"
MODEL_PORT="${MODEL_PORT:-8000}"
TEE_PORT="${TEE_PORT:-8080}"
OLLAMA_BASE_URL="${OLLAMA_BASE_URL:-http://ollama:11434}"
MODEL_NAME="${MODEL_NAME:-llama3.1:8b}"

log() { echo "[cvm-start] $*"; }

if ! command -v git >/dev/null 2>&1; then
  export DEBIAN_FRONTEND=noninteractive
  apt-get update
  apt-get install -y --no-install-recommends git curl ca-certificates
fi

log "Upgrading pip and installing build tooling..."
pip install --upgrade pip hatchling

log "Installing SkillVault packages from GitHub (${REF} on ${REPO})..."
GIT_PKG="git+${REPO}@${REF}"
pip install --no-cache-dir "${GIT_PKG}#subdirectory=services/model-server"
pip install --no-cache-dir "tee-runner[dstack] @ ${GIT_PKG}#subdirectory=services/tee-runner"

export PYTHONPATH="/usr/local/lib/python3.12/site-packages:${PYTHONPATH:-}"

log "Waiting for Ollama at ${OLLAMA_BASE_URL}..."
until curl -sf "${OLLAMA_BASE_URL}/api/tags" >/dev/null; do
  sleep 3
done
log "Ollama is ready"

if [[ "${OLLAMA_PULL_ON_START:-true}" == "true" ]]; then
  log "Pulling model ${MODEL_NAME} (may take 10-20 min on first boot)..."
  curl -sf "${OLLAMA_BASE_URL}/api/pull" -d "{\"name\":\"${MODEL_NAME}\",\"stream\":false}" >/dev/null
  log "Model pull complete"
fi

log "Starting model-server on :${MODEL_PORT}..."
uvicorn model_server.main:app --host 127.0.0.1 --port "${MODEL_PORT}" &
MODEL_PID=$!

log "Starting tee-runner on :${TEE_PORT} (RUNNER_MODE=${RUNNER_MODE:-dstack})..."
uvicorn tee_runner.main:app --host 0.0.0.0 --port "${TEE_PORT}" &
TEE_PID=$!

trap 'kill ${MODEL_PID} ${TEE_PID} 2>/dev/null || true' EXIT
wait "${TEE_PID}"
