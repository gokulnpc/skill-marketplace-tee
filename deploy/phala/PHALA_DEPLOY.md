# Phala production deployment

Deploy SkillVault evaluation stack to a **Phala Confidential VM (CVM)** with:
- **Real TDX attestation** via dstack (`/var/run/dstack.sock`)
- **Real open-weight model** via Ollama (`llama3.1:8b`) inside the same CVM
- **tee-runner + model-server** in one container; Ollama in a sibling container

The marketplace API and web UI stay **outside** the TEE on your machine (or any host). They call the CVM's public tee-runner URL.

---

## What you need from Phala

| Item | Purpose |
| ---- | ------- |
| **Phala Cloud account** | Deploy CVMs — sign up at [cloud.phala.network](https://cloud.phala.network) |
| **`phala` CLI login** | `npm i -g phala && phala login` (browser device flow) |
| **CVM with enough RAM** | Llama 3.1 8B via Ollama needs **≥16 GB RAM** (32 GB recommended) |
| **Public URL from CVM** | Set `TEE_RUNNER_URL` on your marketplace API to this URL |

**No dstack API key inside the CVM.** The guest agent socket is injected automatically when you mount `/var/run/dstack.sock`.

Optional for CI/CD: Phala **API token** from Dashboard → API Tokens (used by `phala login --manual`, not by tee-runner).

---

## Architecture (production)

```text
Your laptop / cloud host                    Phala CVM (TEE)
┌─────────────────────────┐                ┌──────────────────────────────┐
│ apps/web      :3000     │                │  ollama (llama3.1:8b)        │
│ apps/api      :3001     │─── HTTPS ────► │  skillvault-tee              │
│ packages/cli            │   eval jobs    │    ├ model-server :8000      │
└─────────────────────────┘                │    └ tee-runner    :8080 ◄──┤
                                           │         ▲ dstack.sock       │
                                           └──────────────────────────────┘
```

Inside the CVM:
1. Buyer dataset + seller skill arrive encrypted
2. tee-runner decrypts (RSA session keys)
3. model-server calls Ollama for baseline + with-skill inference
4. Verifier + leakage guard score outputs
5. dstack signs TDX attestation quote; Ed25519 receipt issued
6. Only scores + proof leave the CVM

---

## Deploy steps

### 0. Push code to GitHub first

The CVM installs app code from GitHub at startup (`pip install git+...`). **Push to `main` before deploying**, or the CVM will run stale/missing code (no Ollama backend).

```bash
git add deploy/ services/ README.md .env.example
git commit -m "Phala deploy: git-bootstrap compose + Ollama backend"
git push origin main
```

Regenerate the Phala compose file if you edit `cvm-start.sh`:

```bash
bash deploy/phala/prepare-compose.sh
git add deploy/phala/docker-compose.phala.yml && git commit -m "Regenerate Phala compose" && git push
```

### 1. Install Phala CLI and log in

```bash
npm install -g phala
phala login
phala status
```

### 2. Deploy from this repo

Use **`docker-compose.phala.yml`** (embedded startup script — no Docker `build:` on Phala):

```bash
cd deploy/phala
phala deploy -c docker-compose.phala.yml -n skillvault-tee -t tdx.xlarge --wait
```

Use **`tdx.xlarge` (16 GB RAM)** minimum for `llama3.1:8b`. Do not use `docker-compose.yml` with `build:` — Phala cannot access your local repo context (error: `lstat /deploy: no such file or directory`).

### 3. Get the public tee-runner URL

```bash
phala cvms get skillvault-tee
phala cvms get skillvault-tee --json | jq -r '.public_urls[] | select(.port==8080) | .app'
```

Verify:

```bash
curl https://YOUR-CVM-URL/health
# expect: {"status":"ok","mode":"dstack",...}
```

### 4. Point your marketplace API at the CVM

On the machine running `apps/api`:

```bash
export TEE_RUNNER_URL=https://YOUR-CVM-URL
pnpm dev:api
```

Or add to `.env`:

```env
TEE_RUNNER_URL=https://YOUR-CVM-URL
RUNNER_HASH=sha256:skillvault-tee-runner-v1
VERIFIER_HASH=sha256:skillvault-verifier-v1
MODEL_HASH=sha256:ollama-llama3.1-8b
```

### 5. Run web UI + evaluate

```bash
pnpm dev:web
```

Open http://localhost:3000 → **Discreet Meeting Notes** → upload `skills/sample-datasets/discreet-meeting-notes/demo_eval_dataset.json`.

The scorecard should show `mode: dstack` and a real TDX quote (long hex), not `mock-tdx-quote`.

---

## Verify attestation

Inside the CVM (optional):

```bash
phala ssh skillvault-tee
python -c "
from dstack_sdk import DstackClient
c = DstackClient()
print(c.info())
q = c.get_quote(b'test')
print(q.quote[:80], '...')
"
```

From outside, use Phala Trust Center or [dstack verifier docs](https://docs.phala.com) to validate quotes returned in `/v1/sessions/{id}/attestation`.

---

## Environment reference

### Inside CVM (`skillvault-tee` container)

| Variable | Default | Description |
| -------- | ------- | ----------- |
| `RUNNER_MODE` | `dstack` | Use real dstack attestation |
| `DSTACK_STRICT` | `true` | Fail if dstack socket missing (no mock fallback) |
| `MODEL_MODE` | `ollama` | Real inference via Ollama |
| `MODEL_NAME` | `llama3.1:8b` | Ollama model tag |
| `OLLAMA_BASE_URL` | `http://ollama:11434` | Internal Ollama service |
| `RUNNER_HASH` | pinned hash | Buyers verify against this |
| `VERIFIER_HASH` | pinned hash | Buyers verify against this |
| `MODEL_HASH` | pinned hash | Buyers verify against this |

### On marketplace host

| Variable | Description |
| -------- | ----------- |
| `TEE_RUNNER_URL` | Public URL of CVM tee-runner (`https://...`) |

---

## Local dstack simulator (optional)

For development without Phala hardware:

```bash
# Terminal 1: dstack simulator (see dstack-sdk docs)
# Terminal 2:
export RUNNER_MODE=dstack
export DSTACK_ENDPOINT=http://localhost:8090
export DSTACK_STRICT=false
export MODEL_MODE=ollama
uvicorn tee_runner.main:app --port 8080
```

---

## Troubleshooting

| Issue | Fix |
| ----- | --- |
| `dstack client unavailable` | Confirm `/var/run/dstack.sock` is mounted in compose |
| Ollama pull timeout | Use larger CVM; re-deploy |
| Inference 502 | Check `phala logs skillvault-tee`; ensure Ollama container is running |
| Evaluation fails threshold | Real model outputs vary; try `demo_eval_dataset.json` at 0.75 or tune prompts |
| API still hits localhost:8080 | Set `TEE_RUNNER_URL` to CVM public URL and restart API |

---

## What to send when ready

When you have Phala access, you do **not** need to share passwords. For help debugging:

1. Output of `phala status`
2. CVM name + public tee-runner URL (not secret)
3. `curl $TEE_RUNNER_URL/health`
4. `phala logs skillvault-tee` (last 50 lines)

We can then wire your marketplace host to the live CVM and validate a full encrypted evaluation.

---

## Agent stack (Ari Juels / papers.zip → slides.pptx)

For **agent evaluations** with NEAR private inference (no Ollama in CVM):

```text
Railway web + API                    Phala CVM (skillvault-agent)
┌─────────────────────────┐          ┌─────────────────────────────────┐
│ apps/web                │          │  skillvault-agent (single box)  │
│ apps/api  ──HTTPS──────►│          │    sandbox-manager  :8091       │
└─────────────────────────┘          │    model-server     :8000       │
                                     │    tee-runner       :8080 ◄─────┤
                                     │         ▲ dstack.sock           │
                                     └─────────────────────────────────┘
                                              │
                                              ▼ NEAR AI (qwen3-30b GPU TEE)
```

### Prerequisites

1. **Push agent code to GitHub** — the CVM runs `pip install git+https://github.com/gokulnpc/skill-marketplace-tee.git@main`. Unpushed local commits are invisible to Phala.
2. **`NEAR_API_KEY`** from [cloud.near.ai](https://cloud.near.ai) — required at deploy time (`-e NEAR_API_KEY=...`).
3. **Railway API** env: `TEE_RUNNER_URL` = public Phala tee-runner URL (port 8080).

Regenerate compose after editing `cvm-start-agent.sh`:

```bash
bash deploy/phala/prepare-compose-agent.sh
```

### Deploy agent CVM

```bash
export NEAR_API_KEY="your-key-from-cloud.near.ai"

cd deploy/phala
phala deploy \
  -c docker-compose.phala.agent.yml \
  -n skillvault-agent \
  -t tdx.large \
  --wait \
  -e "NEAR_API_KEY=$NEAR_API_KEY"
```

Use **`tdx.large`** (8 GB RAM) — no local model weights; inference is NEAR-hosted.

Get the public URL:

```bash
phala cvms get skillvault-agent --json | jq -r '.public_urls[] | select(.port==8080) | .app'
curl https://YOUR-AGENT-CVM-URL/health
# expect: {"status":"ok","mode":"dstack"}
```

### Update existing `skillvault-tee` instead (same URL)

If Railway already points at `skillvault-tee` and you want to **replace** the Ollama stack in place:

```bash
phala deploy \
  -c docker-compose.phala.agent.yml \
  -n skillvault-tee \
  -t tdx.large \
  --wait \
  -e "NEAR_API_KEY=$NEAR_API_KEY"
```

The public URL usually stays the same; confirm with `phala cvms get skillvault-tee`.

### Railway environment (API service)

| Variable | Value |
| -------- | ----- |
| `TEE_RUNNER_URL` | `https://…-8080.dstack-pha-prod5.phala.network` |
| `RUNNER_HASH` | `sha256:skillvault-tee-runner-v2` |
| `VERIFIER_HASH` | `sha256:skillvault-verifier-v2` |
| `MODEL_HASH` | `sha256:near-qwen3-30b` |
| `SKILL_STORAGE_SECRET` | strong random secret |

Web service: `NEXT_PUBLIC_API_URL` = your Railway API URL.

Also commit **`apps/api/seed/ari-portable-skill.zip`** so the Railway API service (watched path `apps/api/**`) seeds the `ari-juels` listing on deploy.

### Smoke test

1. Open Railway web UI → **Ari Juels** skill → Evaluate.
2. Upload a papers zip → run evaluation.
3. Scorecard should show NEAR attestation + **Download slides.pptx**.
