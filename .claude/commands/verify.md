# Verify — Implementation vs Plan

Cross-reference the implementation plan against progress trackers and existing code.

## Steps

1. Read `docs/IMPLEMENTATION.md` for planned phases and deliverables.
2. Read all `progress/phase-*.md` files and compare task status to deliverables.
3. Check whether planned code directories exist:
   - `apps/web/`
   - `apps/api/`
   - `packages/cli/`
   - `services/tee-runner/`
   - `services/model-server/`
   - `skills/discreet-meeting-notes/`
4. For each phase, list:
   - Tasks marked done but with no corresponding code
   - Tasks still pending where partial code exists
   - Deliverables in IMPLEMENTATION.md with no progress task

## Output format

### Phase-by-phase gaps
For each phase 1–6: aligned / gaps / stale items

### Missing directories
List expected code paths that do not exist yet

### Recommendations
Prioritized list of what to implement next to close the largest gaps

Arguments: $ARGUMENTS
