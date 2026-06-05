# Dashboard — Project Status

Provide a concise project status overview for SkillVault TEE.

## Steps

1. Read `PROGRESS.md` for phase overview.
2. Read all files in `progress/phase-*.md` and count tasks by status (pending, in_progress, done, blocked).
3. Read the last 5 entries from `CHANGELOG.md` under `[Unreleased]`.
4. Read the last 3 rows from `ERRORLOG.md` (if any).
5. Identify the active phase (first phase not fully complete).

## Output format

### Active phase
- Phase name, file link, completion fraction

### Task summary
- Total tasks across all phases
- Count by status: done / in_progress / pending / blocked

### Blockers
- List any tasks with non-empty Blockers column

### Recent activity
- Latest CHANGELOG entries
- Latest ERRORLOG entries (if any)

### Next recommended task
- First pending task in the active phase

Do not include a deadline countdown — this project has no fixed deadline.

Arguments: $ARGUMENTS
