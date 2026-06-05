# Phase 4: Marketplace Flow

See [docs/IMPLEMENTATION.md](../docs/IMPLEMENTATION.md#phase-4-marketplace-flow).

| Task | Status | Notes | Blockers |
| ---- | ------ | ----- | -------- |
| Implement seller skill upload and validation API | done | `apps/api` POST `/v1/skills/upload` | |
| Build skill listing and browse UI | done | `apps/web` home page | |
| Implement buyer skill selection and threshold input | done | `apps/web/skills/[id]` | |
| Implement eligibility and simulated funds check | done | Balance + reservation in API store | |
| Implement evaluation job creation and status API | done | POST/GET `/v1/evaluations` | |
| Build buyer CLI (`packages/cli/`) | done | `skillvault eval ...` | |
| Build scorecard UI | done | `apps/web/evaluations/[id]` | |

## Run full stack

```bash
# Terminal 1 — model server
cd services/model-server && source .venv/bin/activate
uvicorn model_server.main:app --port 8000

# Terminal 2 — tee runner
cd services/tee-runner && source .venv/bin/activate
uvicorn tee_runner.main:app --port 8080

# Terminal 3 — marketplace API
pnpm --filter @skillvault/api dev

# Terminal 4 — web UI
pnpm --filter @skillvault/web dev

# Terminal 5 — CLI eval
pnpm --filter @skillvault/cli exec tsx src/index.ts eval \
  --skill discreet-meeting-notes \
  --dataset skills/sample-datasets/discreet-meeting-notes/buyer_eval_dataset.json \
  --threshold 0.85
```
