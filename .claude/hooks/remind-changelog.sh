#!/usr/bin/env bash
# Remind to update CHANGELOG and progress when source files are edited.
set -euo pipefail

input=$(cat)

file_path=""
if command -v jq >/dev/null 2>&1; then
  file_path=$(echo "$input" | jq -r '
    .tool_input.file_path //
    .tool_input.filePath //
    .tool_response.filePath //
    empty
  ' 2>/dev/null || true)
fi

# Also check environment variable set by some Claude Code versions
if [[ -z "$file_path" && -n "${CLAUDE_FILE_PATHS:-}" ]]; then
  file_path="$CLAUDE_FILE_PATHS"
fi

should_remind=false
if [[ -n "$file_path" ]]; then
  case "$file_path" in
    apps/*|packages/*|services/*|skills/*)
      should_remind=true
      ;;
  esac
fi

if [[ "$should_remind" == "true" ]]; then
  cat <<EOF
{
  "hookSpecificOutput": {
    "hookEventName": "PostToolUse",
    "additionalContext": "Source file edited ($file_path). Remember to: (1) append CHANGELOG.md under [Unreleased], (2) update the relevant progress/phase-*.md task table, (3) run tests."
  }
}
EOF
fi

exit 0
