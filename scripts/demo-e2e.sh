#!/usr/bin/env bash
# End-to-end demo validation per PRD §17.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DATASET="${DEMO_DATASET:-$ROOT/skills/sample-datasets/discreet-meeting-notes/demo_eval_dataset.json}"
MODEL_URL="${MODEL_SERVER_URL:-http://localhost:8000}"
TEE_URL="${TEE_RUNNER_URL:-http://localhost:8080}"
API_URL="${API_URL:-http://localhost:3001}"
THRESHOLD="${DEMO_THRESHOLD:-0.85}"
BUYER_ID="${DEMO_BUYER_ID:-buyer_demo}"

log() { printf '\n==> %s\n' "$*"; }

wait_for() {
  local name="$1"
  local url="$2"
  local attempts="${3:-30}"
  local i=1
  while [ "$i" -le "$attempts" ]; do
    if curl -sf "$url" >/dev/null 2>&1; then
      log "$name is up ($url)"
      return 0
    fi
    sleep 1
    i=$((i + 1))
  done
  echo "Timed out waiting for $name at $url" >&2
  exit 1
}

log "Checking services"
wait_for "model-server" "$MODEL_URL/health"
wait_for "tee-runner" "$TEE_URL/health"
wait_for "marketplace-api" "$API_URL/health"

log "Ensuring demo buyer has funds"
curl -sf -X POST "$API_URL/v1/buyers/$BUYER_ID/deposit" \
  -H "Content-Type: application/json" \
  -d '{"amount": 100}' >/dev/null

log "Running buyer CLI evaluation (dataset: $(basename "$DATASET"))"
OUTPUT="$(pnpm --dir "$ROOT/packages/cli" exec tsx src/index.ts eval \
  --skill discreet-meeting-notes \
  --dataset "$DATASET" \
  --threshold "$THRESHOLD" \
  --buyer "$BUYER_ID" \
  --api "$API_URL" 2>&1)"
printf '%s\n' "$OUTPUT"

if ! printf '%s' "$OUTPUT" | grep -q "Result:         PASS"; then
  echo "Expected PASS result for demo dataset at threshold $THRESHOLD" >&2
  exit 1
fi

if ! printf '%s' "$OUTPUT" | grep -q "Payment:        Charged"; then
  echo "Expected buyer to be charged on pass" >&2
  exit 1
fi

if ! printf '%s' "$OUTPUT" | grep -q "License:"; then
  echo "Expected license to be issued on pass" >&2
  exit 1
fi

log "Verifying signing public key endpoint"
curl -sf "$TEE_URL/v1/signing-public-key" | grep -q "public_key_pem"

log "Demo script completed successfully"
