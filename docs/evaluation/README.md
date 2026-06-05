# Evaluation

Baseline vs with-skill evaluation, verification, and leakage prevention inside the TEE.

## Pipeline

1. Load buyer dataset and seller skill (decrypted inside TEE)
2. Run baseline inference (no skill)
3. Run with-skill inference
4. Verifier scores both outputs against ground truth
5. Leakage guard checks approved output
6. Receipt signer records scores and pass/fail

## Topics

- [baseline-vs-skill.md](baseline-vs-skill.md) — Dual-run evaluation model
- [redaction-verifier.md](redaction-verifier.md) — Redaction scoring rules
- [leakage-guard.md](leakage-guard.md) — Output leakage prevention

## Scoring summary

| Metric | Definition |
| ------ | ---------- |
| Baseline score | Quality without seller skill |
| Skill score | Quality with seller skill |
| Uplift | Improvement attributable to skill |

## Related

- [../tee-runner/](../tee-runner/)
- [../model-server/](../model-server/)
- [../skill-package/](../skill-package/)
