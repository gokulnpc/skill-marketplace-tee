#!/usr/bin/env bash
# Remind to append ERRORLOG.md when a Bash command fails.
set -euo pipefail

input=$(cat)

command=""
error_msg=""
if command -v jq >/dev/null 2>&1; then
  command=$(echo "$input" | jq -r '.tool_input.command // empty' 2>/dev/null || true)
  error_msg=$(echo "$input" | jq -r '.error // .tool_response.stderr // .message // empty' 2>/dev/null || true)
fi

context="${command:-unknown command}"
if [[ -n "$error_msg" ]]; then
  context="$context — ${error_msg:0:200}"
fi

cat <<EOF
{
  "hookSpecificOutput": {
    "hookEventName": "PostToolUseFailure",
    "additionalContext": "Command failed: $context. Append ERRORLOG.md with: date, context, root cause, and prevention steps."
  }
}
EOF

exit 0
