# Review — Git Diff and Next Steps

Summarize current changes and suggest changelog entry, commit message, and next task.

## Steps

1. Run `git status` and `git diff` (staged and unstaged).
2. Run `git diff --stat` for a file summary.
3. Read `PROGRESS.md` and the active phase file for the next pending task.
4. Read `CHANGELOG.md` to see current `[Unreleased]` section.

## Output format

### Changed files
Summary of what changed and why (inferred from diff)

### Suggested CHANGELOG entry
One bullet under `[Unreleased]` matching Keep a Changelog format

### Suggested commit message
Conventional commit style, 1–2 sentences focusing on why

### Next step
First pending task from the active phase with link to progress file

### Reminders
- Update progress task table if work completes a task
- Append FEEDBACK.md if a decision was made
- Append docs/AI_BUILD_LOG.md if AI-assisted

Arguments: $ARGUMENTS
