# SkillVault TEE — Implementation Plan

Phased build aligned with PRD §16. Track task status in `progress/phase-*.md`.

## Phase 1: Core TEE Runner

**Goal:** Secure FastAPI runner with attestation, encrypted input handling, and receipt signing.

**Deliverables:**

- FastAPI application skeleton in `services/tee-runner/`
- Attestation endpoint returning quote, hashes, ephemeral public key
- Ephemeral key generation per session
- Encrypted input receiver (skill + dataset blobs)
- Receipt signer producing signed evaluation records

**Progress:** [phase-01-tee-runner.md](../progress/phase-01-tee-runner.md)

**Docs:** [tee-runner/](tee-runner/)

---

## Phase 2: Local Model Inside TEE

**Goal:** Open-weight model server with OpenAI-compatible API for baseline and with-skill inference.

**Deliverables:**

- Model server in `services/model-server/` (vLLM, llama.cpp, or Ollama)
- OpenAI-compatible `localhost:8000/v1/chat/completions` endpoint
- Baseline inference call from tee-runner
- With-skill inference call from tee-runner

**Progress:** [phase-02-local-model.md](../progress/phase-02-local-model.md)

**Docs:** [model-server/](model-server/)

---

## Phase 3: Redaction Skill Evaluation

**Goal:** End-to-end evaluation for Discreet Meeting Notes with verifier and scoring.

**Deliverables:**

- Discreet Meeting Notes skill package in `skills/discreet-meeting-notes/`
- Buyer sample dataset format and ground truth schema
- Redaction verifier (must-include, must-not-leak, attribution, format)
- Utility/privacy/format scoring pipeline
- Leakage guard integration

**Progress:** [phase-03-redaction-eval.md](../progress/phase-03-redaction-eval.md)

**Docs:** [evaluation/](evaluation/), [skill-package/](skill-package/)

---

## Phase 4: Marketplace Flow

**Goal:** Seller upload through buyer evaluation job orchestration with UI.

**Deliverables:**

- Seller skill upload and validation
- Skill listing and browse UI
- Buyer skill selection and threshold input
- Eligibility and simulated funds check
- Evaluation job creation and status tracking
- Scorecard UI

**Progress:** [phase-04-marketplace-flow.md](../progress/phase-04-marketplace-flow.md)

**Docs:** [marketplace-api/](marketplace-api/), [marketplace-ui/](marketplace-ui/), [buyer-cli/](buyer-cli/)

---

## Phase 5: Payment and License Simulation

**Goal:** Threshold-based settlement with internal balance and license records.

**Deliverables:**

- Internal balance accounts for buyers and sellers
- Pass/fail settlement logic tied to TEE receipt
- Seller credit on successful purchase
- Buyer license record and status

**Progress:** [phase-05-payment-license.md](../progress/phase-05-payment-license.md)

**Docs:** [settlement/](settlement/)

---

## Phase 6: Demo Polish

**Goal:** Demo-ready end-to-end experience with proof display.

**Deliverables:**

- TEE proof card (attestation, hashes)
- Scorecard with baseline, skill score, uplift
- Payment status display
- License status display
- Audit receipt viewer
- End-to-end demo script validation

**Progress:** [phase-06-demo-polish.md](../progress/phase-06-demo-polish.md)

**Docs:** [marketplace-ui/buyer-scorecard.md](marketplace-ui/buyer-scorecard.md)

---

## Sprint discipline

For each task:

1. Update status in the matching `progress/phase-*.md` file.
2. Write tests before or alongside implementation.
3. Append `CHANGELOG.md` on completion.
4. Log decisions in `FEEDBACK.md` when trade-offs arise.
5. Log errors in `ERRORLOG.md` with prevention steps.

## Related docs

- [PROJECT.md](PROJECT.md) — MVP scope
- [TECHNICAL.md](TECHNICAL.md) — architecture
- [PROGRESS.md](../PROGRESS.md) — current status
