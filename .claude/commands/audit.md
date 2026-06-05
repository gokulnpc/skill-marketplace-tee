# Audit — Docs Consistency Check

Grep documentation for stale naming and verify cross-references.

## Steps

1. Search docs for stale or incorrect terms:
   - NEAR AI presented as MVP default (should be optional/future only)
   - "downloadable skill" or "download skill" as a feature (non-goal)
   - External LLM API as default eval path (should be disabled/non-goal)
   - Blockchain escrow as MVP feature (simulated balance only for MVP)
2. Verify cross-links resolve:
   - `PROGRESS.md` → all `progress/phase-*.md` files
   - `progress/*.md` → `docs/IMPLEMENTATION.md` anchors
   - `docs/TECHNICAL.md` → layer README files
   - Layer READMEs → topic files
3. Check naming consistency: "SkillVault TEE" (not alternate product names).
4. Check `CLAUDE.md` stack description matches `docs/TECHNICAL.md`.

## Output format

### Stale naming hits
File, line, term, suggested correction

### Broken cross-references
File, link target, status

### Consistency issues
Any mismatches between PRD, PROJECT.md, and TECHNICAL.md

### Clean bill
If no issues found, confirm docs are consistent

Arguments: $ARGUMENTS
