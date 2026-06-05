# SkillVault TEE — Claude Code Guide

## Project

**SkillVault TEE** is a private AI agent skill marketplace where sellers monetize private skills and buyers evaluate them on private datasets before purchasing. Evaluation runs inside a marketplace-hosted Phala TEE with a local open-weight model. Only the score, proof, and approved output leave the TEE.

## Stack

| Layer | Technology |
| ----- | ---------- |
| Monorepo | pnpm workspaces |
| Marketplace UI | Next.js + TypeScript |
| Marketplace API | Node/TypeScript (or co-located with web) |
| Buyer CLI | TypeScript (`skillvault eval ...`) |
| TEE runner | Python 3.11+ / FastAPI |
| Model server | vLLM, llama.cpp, or Ollama (OpenAI-compatible) |
| TEE platform | Phala TEE |
| Default model | Llama 3.1 8B Instruct (MVP) |

## Hard constraints

1. Buyer evaluation data and seller skill never leave the TEE in plaintext.
2. Default inference is a local open-weight model inside the TEE — no external LLM API for private evaluations.
3. MVP uses simulated internal balance — no blockchain escrow.
4. First MVP skill: **Discreet Meeting Notes** (meeting redaction).
5. Buyers cannot download raw skills; sellers cannot see buyer datasets.
6. Marketplace cannot inspect buyer plaintext evaluation data.

## Repo structure

```text
skill-mp/
├── CLAUDE.md              # This file
├── PRD.md                   # Full product requirements (source of truth)
├── PROGRESS.md              # Phase overview — read first
├── CHANGELOG.md             # User-facing change log
├── ERRORLOG.md              # Failure root causes
├── FEEDBACK.md              # Decision log
├── docs/                    # Architecture and layer docs
├── progress/                # Per-phase task tables
├── .claude/                 # Hooks, permissions, slash commands
├── apps/web/                # Next.js marketplace UI (future)
├── apps/api/                # Marketplace API (future)
├── packages/cli/            # Buyer CLI (future)
├── services/tee-runner/     # FastAPI TEE runner (future)
├── services/model-server/   # Local model server (future)
└── skills/                  # Skill packages (future)
```

## Context loading order

1. Read `PROGRESS.md` for current phase and blockers.
2. Open the active `progress/phase-*.md` file for task status.
3. Read the relevant layer README in `docs/<layer>/`.
4. Consult `docs/TECHNICAL.md` for interfaces and data flows.
5. Use `PRD.md` for full product detail when needed.

## Workflow rules

### On every feature or fix

1. Append an entry to `CHANGELOG.md` under `[Unreleased]`.
2. Write or update tests for the changed behavior.
3. Run tests and fix failures before marking tasks done.
4. Update the task table in the relevant `progress/phase-*.md` file.
5. Update task counts in `PROGRESS.md` when a phase task completes.

### On errors

Append a row to `ERRORLOG.md` with: date, context, root cause, and prevention.

### On decisions

Append a row to `FEEDBACK.md` with: date, decision, alternatives considered, and reasoning.

### On AI-assisted work

Append a dated entry to `docs/AI_BUILD_LOG.md` describing what was built, prompts used, and outcomes.

## Key commands

These apply once packages are scaffolded:

```bash
pnpm install
pnpm dev                              # API + web in parallel
pnpm --filter @skillvault/api dev     # Marketplace API (:3001)
pnpm --filter @skillvault/web dev     # Next.js UI (:3000)
pnpm --filter @skillvault/cli exec tsx src/index.ts eval --help
cd services/model-server && pytest
cd services/tee-runner && pytest
pnpm --filter @skillvault/api test
```

## Slash commands

| Command | Purpose |
| ------- | ------- |
| `/dashboard` | Project status overview |
| `/verify` | Cross-reference implementation vs plan docs |
| `/test` | Run all test suites |
| `/audit` | Check docs for stale naming and broken cross-references |
| `/review` | Git diff summary, changelog/commit suggestions |
