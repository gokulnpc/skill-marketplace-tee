# Baseline vs With-Skill Evaluation

Every evaluation runs twice inside the TEE to measure skill uplift.

## Baseline run

Model receives a generic task instruction without the seller's skill.

For redaction MVP, baseline instruction example:

```text
Summarize this meeting transcript. Include action items and decisions.
Do not include speaker names.
```

## With-skill run

Model receives the seller's private skill instructions (from `SKILL.md` and related files).

The Discreet Meeting Notes skill adds redaction policies, must-not-leak handling, and output schema.

## Per-sample flow

For each transcript in the buyer dataset:

1. Baseline: model → output → verifier scores
2. With-skill: model + skill → output → verifier scores

## Aggregate scoring

```text
baseline_score = mean(per_sample_baseline_scores)
skill_score    = mean(per_sample_skill_scores)
uplift         = skill_score - baseline_score
```

## Threshold check

```text
passed = skill_score >= buyer_threshold
```

Uplift is displayed for transparency but threshold applies to skill score.

## Related

- [redaction-verifier.md](redaction-verifier.md)
- [../model-server/openai-compatible-api.md](../model-server/openai-compatible-api.md)
- [../tee-runner/receipt-signing.md](../tee-runner/receipt-signing.md)
