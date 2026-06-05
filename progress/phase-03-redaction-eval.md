# Phase 3: Redaction Skill Evaluation

See [docs/IMPLEMENTATION.md](../docs/IMPLEMENTATION.md#phase-3-redaction-skill-evaluation).

| Task | Status | Notes | Blockers |
| ---- | ------ | ----- | -------- |
| Create Discreet Meeting Notes skill in `skills/discreet-meeting-notes/` | done | SKILL.md, metadata.json, example output | |
| Define buyer sample dataset format and ground truth schema | done | `skills/sample-datasets/discreet-meeting-notes/` | |
| Implement redaction verifier | done | `tee_runner/evaluation/redaction_verifier.py` | |
| Implement utility/privacy/format scoring pipeline | done | `tee_runner/evaluation/scoring_pipeline.py` | |
| Integrate leakage guard | done | `tee_runner/evaluation/leakage_guard.py` | |

## Evaluate flow

1. Complete inference (`POST /v1/sessions/{id}/inference`).
2. Run evaluation (`POST /v1/sessions/{id}/evaluate`) — scores baseline vs with-skill, applies leakage guard.
3. Finalize with auto-scores (`POST /v1/sessions/{id}/finalize` with empty body) or manual scores.

## Sample assets

- Skill: [skills/discreet-meeting-notes/](../../skills/discreet-meeting-notes/)
- Dataset: [skills/sample-datasets/discreet-meeting-notes/buyer_eval_dataset.json](../../skills/sample-datasets/discreet-meeting-notes/buyer_eval_dataset.json)
