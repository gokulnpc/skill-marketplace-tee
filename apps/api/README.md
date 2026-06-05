# SkillVault Marketplace API

Orchestration API for skill listings, buyer evaluations, and TEE runner coordination.

## Run

```bash
pnpm --filter @skillvault/api dev
```

Requires tee-runner (`:8080`) and model-server (`:8000`) for full evaluation flow.

## Endpoints

| Method | Path | Description |
| ------ | ---- | ----------- |
| GET | `/v1/skills` | List published skills |
| GET | `/v1/skills/:id` | Skill detail |
| POST | `/v1/skills/upload` | Upload and validate skill |
| GET | `/v1/buyers/:id/balance` | Simulated buyer balance |
| POST | `/v1/evaluations` | Create evaluation job + TEE session |
| GET | `/v1/evaluations/:id` | Job status and results |
| POST | `/v1/evaluations/:id/dataset` | Submit encrypted dataset, run pipeline |

## Env

- `PORT` — default `3001`
- `TEE_RUNNER_URL` — default `http://localhost:8080`
