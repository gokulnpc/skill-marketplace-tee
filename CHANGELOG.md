# Changelog

All notable changes to SkillVault TEE are documented in this file.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- **Ari Juels demo (frontend + E2E):** Marketplace seeds `ari-juels` from `ari-portable-skill.zip`; catalog entry with agent/slides copy.
- Commit `ari-portable-skill.zip` at repo root so Railway API seeds the Ari listing on deploy.
- Move Ari seed zip to `apps/api/seed/` so Railway API watch paths trigger redeploy and bundle the package with the API service.
- Buyer evaluate flow accepts **papers.zip** for agent skills (`PapersZipStep` with client-side validation and commitment hash).
- Papers zip dataset format in tee-runner: safe extract → single slide-generation agent task → PPTX artifact export.
- Agent tools: `list_papers`, `read_paper`, `generate_slides_pptx` (python-pptx) in builtin harness and sandbox agent loop.
- API/TEE artifact download: `GET /v1/evaluations/:jobId/artifacts/slides.pptx`.
- Scorecard **Download slides.pptx** button; agent-specific attestation checks and NEAR pipeline steps in UI.
- Integration tests for papers zip → agent tool loop → PPTX artifact → eval pass.

- Zip-based portable skill packages (`skillvault-1` manifest, tree hash, encrypted blob storage).
- Agent evaluation harness with builtin knowledge tools (`read_file`, `list_dir`, `grep_knowledge`).
- `services/sandbox-manager/` per-session sandbox sidecar (dstack-webhost-inspired unpack + harness exec).
- NEAR AI private inference mode (`MODEL_MODE=near_private`) with attestation fields in receipts.
- Session-scoped internal model proxy at `/v1/internal/chat/completions`.
- `deploy/phala/docker-compose.agent.yml` for agent + sandbox + NEAR inference stack.
- Docs: `docs/skill-package/portable-agent.md`, `docs/inference/near-private.md`.

### Changed

- Seller upload accepts multipart `.zip` packages; legacy JSON `skill_content` still supported.
- `tee-runner` uses `AgentEvaluationService` instead of single-shot `InferenceService`.
- Package hash is SHA-256 tree hash over zip contents (excludes `adapters/`).


- Refactored `apps/web` to the warm-paper editorial design from the Tee prototype: Instrument Serif / Inter / JetBrains Mono, shared primitives, and all marketplace screens (browse, skill detail, evaluate flow, running, scorecard, upload, seller, licenses) as Next.js App Router pages wired to the marketplace API.
- Removed the standalone `Tee/` Babel prototype and legacy Tailwind scorecard components.

### Added

- `ScorecardScreen` — warm-paper editorial scorecard with editorial/dashboard/proof-first variations, wired to real evaluation API data.
- Phala production path: `deploy/phala/` Docker + compose, Ollama backend, real dstack attestation adapter.
- `deploy/phala/PHALA_DEPLOY.md` and `.env.example` for CVM deployment.

### Added

- Root [README.md](README.md) with quick start, architecture, and demo instructions.

### Fixed

- `pnpm test` no longer fails when CLI has no test files; includes Python pytest suites.

### Added

- Demo polish: scorecard components, TEE proof card, audit receipt viewer with signature verify.
- Receipt verification endpoints on tee-runner and marketplace API.
- `scripts/demo-e2e.sh` and `pnpm demo` for PRD §17 validation.
- Shared receipt canonicalization and Ed25519 verify helpers.

### Added

- Payment settlement: receipt verification, buyer charge on pass, seller credit, license issuance.
- API routes: seller balance, buyer licenses, license lookup.
- Web scorecard Payment & License section; CLI shows payment and license on eval.
- Settlement tests (7 API tests passing).

### Added

- pnpm monorepo: `apps/api`, `apps/web`, `packages/cli`, `packages/shared`.
- Marketplace API: skill upload/list, buyer balance, evaluation jobs, TEE orchestration.
- Next.js UI: browse, upload, evaluate, scorecard pages.
- Buyer CLI: `skillvault eval` with attestation verify + dataset encryption.
- Shared hybrid encryption compatible with tee-runner envelopes.

### Added

- Discreet Meeting Notes skill package and sample buyer evaluation dataset.
- Redaction verifier, leakage guard, and weighted scoring pipeline in tee-runner.
- `POST /v1/sessions/{id}/evaluate` with auto-score finalize support.
- 12 tee-runner tests passing (5 new for Phase 3).

### Added

- `services/model-server/` OpenAI-compatible chat completions API (mock mode).
- Tee-runner model client and inference service (baseline vs with-skill prompts).
- `POST /v1/sessions/{id}/inference` endpoint with per-transcript results.
- 10 total tests passing (3 model-server + 7 tee-runner).

### Added

- `services/tee-runner/` FastAPI TEE runner with mock/dstack adapter modes.
- Session lifecycle API: attestation, encrypted skill/dataset inputs, receipt signing.
- Hybrid RSA-OAEP + AES-GCM encryption for encrypted input envelopes.
- Ed25519 signed evaluation receipts with threshold pass/fail.
- pytest suite (6 tests) for Phase 1 endpoints.

### Added

- Initial Claude Code project scaffolding: docs, progress trackers, hooks, and slash commands.

## [0.0.0] - 2026-06-05

### Added

- Repository bootstrap with PRD as source of truth.
