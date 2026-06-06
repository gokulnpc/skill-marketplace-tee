#!/usr/bin/env bash
# Ari agent stack inside Phala CVM: sandbox-manager + tee-runner + NEAR private inference.
set -euo pipefail

REPO="${SKILLVAULT_REPO:-https://github.com/gokulnpc/skill-marketplace-tee.git}"
REF="${SKILLVAULT_REF:-main}"
MODEL_PORT="${MODEL_PORT:-8000}"
TEE_PORT="${TEE_PORT:-8080}"
SANDBOX_PORT="${SANDBOX_PORT:-8091}"

log() { echo "[cvm-start-agent] $*"; }

if ! command -v git >/dev/null 2>&1; then
  export DEBIAN_FRONTEND=noninteractive
  apt-get update
  apt-get install -y --no-install-recommends git curl ca-certificates
fi

log "Upgrading pip and installing build tooling..."
pip install --upgrade pip hatchling setuptools wheel

log "Installing SkillVault packages from GitHub (${REF} on ${REPO})..."
GIT_PKG="git+${REPO}@${REF}"
pip install --no-cache-dir "${GIT_PKG}#subdirectory=services/model-server"
pip install --no-cache-dir "${GIT_PKG}#subdirectory=services/sandbox-manager"
pip install --no-cache-dir "tee-runner[dstack] @ ${GIT_PKG}#subdirectory=services/tee-runner"

export PYTHONPATH="/usr/local/lib/python3.12/site-packages:${PYTHONPATH:-}"

if [[ -z "${NEAR_API_KEY:-}" ]]; then
  log "ERROR: NEAR_API_KEY is required for agent stack (MODEL_MODE=near_private)"
  exit 1
fi

log "Starting sandbox-manager on :${SANDBOX_PORT}..."
export SANDBOX_PORT
export MODEL_PROXY_URL="${MODEL_PROXY_URL:-http://127.0.0.1:${TEE_PORT}}"
uvicorn sandbox_manager.main:app --host 127.0.0.1 --port "${SANDBOX_PORT}" &
SANDBOX_PID=$!

log "Starting model-server on :${MODEL_PORT} (MODEL_MODE=${MODEL_MODE:-near_private})..."
uvicorn model_server.main:app --host 127.0.0.1 --port "${MODEL_PORT}" &
MODEL_PID=$!

log "Starting tee-runner on :${TEE_PORT} (RUNNER_MODE=${RUNNER_MODE:-dstack})..."
export SANDBOX_MANAGER_URL="${SANDBOX_MANAGER_URL:-http://127.0.0.1:${SANDBOX_PORT}}"
uvicorn tee_runner.main:app --host 0.0.0.0 --port "${TEE_PORT}" &
TEE_PID=$!

trap 'kill ${SANDBOX_PID} ${MODEL_PID} ${TEE_PID} 2>/dev/null || true' EXIT
wait "${TEE_PID}"
