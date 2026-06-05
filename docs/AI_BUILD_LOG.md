# AI Build Log

Record of AI-assisted development sessions. Append new entries at the top.

---

## 2026-06-05 — Phase 6: Demo Polish

**Scope:** Demo-ready scorecard UI, receipt verification, end-to-end demo script.

**Created/Updated:**

- `apps/web/components/scorecard/` — ScorePanel, TeeProofCard, PaymentLicenseCard, AuditReceiptViewer
- `packages/shared/src/receipt.ts` — canonical payload + signature verification
- Tee-runner: `/v1/signing-public-key`, `/v1/sessions/{id}/receipt/verify`
- API: `/v1/evaluations/{jobId}/receipt/verify` (proxies to tee-runner)
- `scripts/demo-e2e.sh` — health checks + CLI eval validation

**Decisions:**

- Receipt verify uses tee-runner stored payload (avoids JSON timestamp re-serialization mismatch)
- Scorecard shows percentages, pass/fail badges, copy-friendly hash fields
- Demo script validates PASS + Charged + License issued

**Outcome:** Phase 6 complete. MVP build finished.

---

## 2026-06-05 — Phase 5: Payment and License Simulation

**Scope:** Simulated payment settlement tied to verified TEE receipts.

**Created/Updated:**

- `apps/api/src/settlement.ts` — receipt verification, pass/fail settlement
- `apps/api/src/store.ts` — buyer/seller balances, license records
- `apps/api/src/routes.ts` — seller balance, licenses, auto-settle on dataset submit
- `apps/api/src/settlement.test.ts` — pass, fail, invalid receipt tests
- `apps/web/app/evaluations/[id]/page.tsx` — Payment & License scorecard
- `packages/cli/src/index.ts` — payment and license in eval output

**Decisions:**

- Reserve buyer funds on job create; deduct only on verified pass receipt
- Release reservation on settle (pass or fail); no charge on fail
- License record references receipt_id; no raw skill download
- Idempotent settlement if job already settled

**Outcome:** Phase 5 complete. 7 API tests passing.

---

## 2026-06-05 — Phase 4: Marketplace Flow

**Scope:** Marketplace API, Next.js UI, buyer CLI, evaluation job orchestration.

**Created:**

- `apps/api` — Hono API for skills, balances, evaluation jobs, tee-runner proxy
- `apps/web` — browse, upload, evaluate form, scorecard pages
- `packages/cli` — `skillvault eval` command
- `packages/shared` — types + hybrid encryption envelope

**Decisions:**

- In-memory store for MVP (seeded with Discreet Meeting Notes)
- API encrypts seller skill to TEE session key; buyer encrypts dataset client-side
- Full pipeline triggered on dataset submit (inference → evaluate → finalize)
- Balance reservation on job create; released on completion/failure

**Outcome:** Phase 4 complete. 15 JS tests + 12 Python tests.

---

## 2026-06-05 — Phase 3: Redaction Skill Evaluation

**Scope:** MVP skill, sample dataset, verifier, leakage guard, evaluate endpoint.

**Created:**

- `skills/discreet-meeting-notes/` — SKILL.md, metadata, example output
- `skills/sample-datasets/discreet-meeting-notes/buyer_eval_dataset.json`
- `tee_runner/evaluation/` — redaction verifier, leakage guard, scoring pipeline
- `POST /v1/sessions/{id}/evaluate` — auto-scoring; finalize uses scores when omitted

**Decisions:**

- Must-not-leak failure caps sample score at 0
- Leakage guard blocks canary, skill fragments, ground truth terms, transcript echoes
- Only leakage-guard-approved outputs exported in evaluation response

**Outcome:** Phase 3 complete. 12 tee-runner tests passing.

---

## 2026-06-05 — Phase 2: Local Model Inside TEE

**Scope:** OpenAI-compatible model server and tee-runner inference wiring.

**Created:**

- `services/model-server/` — `/v1/chat/completions`, mock engine with baseline vs skill behavior
- Tee-runner `ModelClient`, `InferenceService`, prompt builders, dataset parser
- `POST /v1/sessions/{id}/inference` — dual-run inference per transcript

**Decisions:**

- Mock model server for dev (no GPU/Ollama required)
- Model server on port 8000, tee-runner on 8080
- Inference results cached on session; idempotent re-fetch
- Scoring deferred to Phase 3 verifier (finalize still accepts manual scores)

**Outcome:** Phase 2 complete. 10 tests passing.

---

## 2026-06-05 — Phase 1: Core TEE Runner

**Scope:** Implement FastAPI evaluation runner with mock TEE mode.

**Created:**

- `services/tee-runner/` — FastAPI app, session store, crypto, mock/dstack adapters
- API: create session, attestation, encrypted inputs, finalize, receipt
- 6 pytest tests — all passing

**Decisions:**

- Default `RUNNER_MODE=mock` for local dev without Phala hardware
- Hybrid RSA-OAEP + AES-GCM for encrypted input envelopes
- Ed25519 for receipt signing in mock mode
- `finalize` endpoint accepts stub scores until Phase 3 eval pipeline exists
- dstack adapter stub falls back to mock when SDK/simulator unavailable

**Outcome:** Phase 1 complete. Ready for Phase 2 (local model server).

---

## 2026-06-05 — Repository bootstrap

**Scope:** Initial Claude Code scaffolding per implementation plan.

**Created:**

- `CLAUDE.md` — project guide, stack, constraints, workflow rules
- Root tracking: `PROGRESS.md`, `CHANGELOG.md`, `ERRORLOG.md`, `FEEDBACK.md`
- `docs/` — PROJECT, TECHNICAL, IMPLEMENTATION, layer subdirs
- `progress/` — six phase task trackers
- `.claude/settings.json` — permissions and hooks
- `.claude/commands/` — dashboard, verify, test, audit, review

**Not created:** Application code (`apps/`, `packages/`, `services/`).

**Outcome:** Docs-only scaffold ready for Phase 1 implementation.
