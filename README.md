# SkillVault TEE

Private AI skill marketplace where sellers list skills and buyers evaluate them on **private datasets** inside an attested TEE. Only scores, proofs, and leakage-guard-approved outputs leave the enclave.

## Quick start

### Prerequisites

- Node 20+ and [pnpm](https://pnpm.io)
- Python 3.11+ with venvs in `services/tee-runner` and `services/model-server`

### Install

```bash
pnpm install
cd services/tee-runner && python -m venv .venv && .venv/bin/pip install -e ".[dev]"
cd ../model-server && python -m venv .venv && .venv/bin/pip install -e ".[dev]"
```

### Run locally (4 terminals)

```bash
# 1. Model server (:8000)
cd services/model-server && .venv/bin/uvicorn model_server.main:app --port 8000

# 2. TEE runner (:8080) — mock mode, no Phala keys required
cd services/tee-runner && .venv/bin/uvicorn tee_runner.main:app --port 8080

# 3. Marketplace API (:3001)
pnpm dev:api

# 4. Web UI (:3000)
pnpm dev:web
```

### End-to-end demo

With all services running:

```bash
pnpm demo
```

Runs the buyer CLI against **Discreet Meeting Notes** at threshold 0.85 — expect PASS, payment charged, and license issued.

### Buyer CLI

```bash
pnpm --filter @skillvault/cli exec tsx src/index.ts eval \
  --skill discreet-meeting-notes \
  --dataset skills/sample-datasets/discreet-meeting-notes/demo_eval_dataset.json \
  --threshold 0.85 \
  --buyer buyer_demo
```

## Architecture

| Service | Port | Role |
| ------- | ---- | ---- |
| `services/model-server` | 8000 | OpenAI-compatible local model (mock in dev) |
| `services/tee-runner` | 8080 | Attestation, encrypted inputs, inference, eval, receipt signing |
| `apps/api` | 3001 | Listings, jobs, TEE orchestration, settlement |
| `apps/web` | 3000 | Browse, upload, evaluate, scorecard |
| `packages/cli` | — | Buyer connector — attestation verify + dataset encryption |

## MVP flow

1. Seller uploads a skill → marketplace validates and stores it encrypted.
2. Buyer sets a score threshold and starts an evaluation job.
3. TEE produces attestation + ephemeral public key.
4. Buyer encrypts a private dataset; marketplace encrypts the skill to the same session.
5. Inside the TEE: baseline run, with-skill run, verifier scoring, leakage guard.
6. **Pass** (score ≥ threshold): signed receipt, buyer charged, seller credited, license issued.
7. **Fail**: no charge, no license. Scorecard shows TEE proof and audit receipt.

## Tests

```bash
pnpm test          # TypeScript packages + Python services
pnpm --filter @skillvault/api test
cd services/tee-runner && .venv/bin/pytest
```

## Docs

- [PRD.md](PRD.md) — full product requirements
- [docs/PROJECT.md](docs/PROJECT.md) — MVP scope
- [docs/TECHNICAL.md](docs/TECHNICAL.md) — architecture
- [PROGRESS.md](PROGRESS.md) — build status (all 6 phases complete)

## Default mode

| Mode | Where | TEE | Model |
| ---- | ----- | --- | ----- |
| **Local dev** | Your laptop | `RUNNER_MODE=mock` — simulated | `MODEL_MODE=mock` — rule-based |
| **Production** | Phala CVM | `RUNNER_MODE=dstack` — real TDX quotes | `MODEL_MODE=ollama` — Llama 3.1 8B |

### Local mock (no Phala)

`RUNNER_MODE=mock` — no Phala credentials required. See **Run locally** above.

### Production on Phala (real TEE + real model)

Full guide: **[deploy/phala/PHALA_DEPLOY.md](deploy/phala/PHALA_DEPLOY.md)**

```bash
npm i -g phala && phala login
cd deploy/phala && phala deploy -c docker-compose.yml -n skillvault-tee
export TEE_RUNNER_URL=https://YOUR-CVM-URL   # on marketplace API host
pnpm dev:api
```

Requires Phala Cloud account and a CVM with **≥16 GB RAM** for Ollama + Llama 3.1 8B.
