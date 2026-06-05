# SkillVault TEE — Project Overview

Distilled from [PRD.md](../PRD.md). Use PRD for full detail.

## Problem

AI agent skills are valuable intellectual property, but buyers need to evaluate them on private data before purchasing. Traditional marketplaces expose either the skill (to the buyer) or the buyer's data (to the seller or model provider).

## Product promise

```text
The buyer brings a private benchmark.
The seller brings a private skill.
The marketplace-hosted TEE runs the evaluation.
The open-weight model runs inside the same TEE.
Only the score, proof, and approved output leave the TEE.
```

SkillVault TEE sells **verified private execution rights**, not downloadable prompts.

## Users

### Seller

Creates and lists private AI skills (prompts, scripts, workflows). Wants to monetize without exposing the skill contents.

Examples: meeting redaction, legal summarization, code review, financial analysis skills.

### Buyer

Evaluates and purchases skills on private datasets. Wants proof of quality before payment without revealing data.

Examples: enterprise testing redaction on private transcripts, legal teams on confidential contracts.

### Marketplace operator

Manages listings, encrypted storage, TEE deployment, attestation verification, evaluation orchestration, payment settlement, and license issuance.

## MVP features

- Seller skill upload with validation and encrypted storage
- Skill browsing and listing metadata
- Buyer threshold commitment before evaluation
- Buyer local CLI connector (dataset encryption to TEE public key)
- Phala TEE attestation verification
- Baseline vs with-skill evaluation inside TEE
- Redaction verifier and leakage guard
- Signed TEE receipt (score, threshold pass/fail, attestation metadata)
- Simulated internal balance and threshold-based settlement
- License record on successful purchase
- Scorecard and TEE proof display

## MVP skill

**Discreet Meeting Notes** — redacts sensitive topics and speaker attribution from meeting transcripts while preserving summaries, action items, and decisions.

See [skill-package/discreet-meeting-notes.md](skill-package/discreet-meeting-notes.md).

## Non-goals (MVP)

- Buyer-hosted TEE or laptop TEE
- Full blockchain escrow
- Multiple model backend marketplace
- Full enterprise admin system
- Public leaderboard for private datasets
- Downloadable skills
- External LLM API for private evaluations
- NEAR AI private inference (optional future mode only)

## Demo script (summary)

1. Seller uploads Discreet Meeting Notes; marketplace validates and encrypts it.
2. Buyer selects skill, sets threshold 0.85, prepares local dataset.
3. Marketplace starts Phala TEE runner with local open-weight model.
4. TEE produces attestation, runner hash, model hash, verifier hash, ephemeral public key.
5. Buyer CLI verifies attestation and encrypts dataset to TEE public key.
6. Marketplace encrypts seller skill to same TEE session.
7. Inside TEE: baseline run, with-skill run, verifier scoring, leakage guard.
8. If score ≥ 0.85: signed pass receipt, buyer charged, seller credited, license issued.
9. If score < 0.85: no charge, no license.
10. Final UI shows scorecard, attestation proof, payment and license status.

## Related docs

- [TECHNICAL.md](TECHNICAL.md) — architecture and interfaces
- [IMPLEMENTATION.md](IMPLEMENTATION.md) — phased build plan
- [security/privacy-model.md](security/privacy-model.md) — privacy guarantees
