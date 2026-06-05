# Test — Run All Test Suites

Run all available test suites and report pass/fail summary.

## Steps

1. If `package.json` exists at repo root, run `pnpm test` (or `npm test` if no pnpm).
2. If `services/tee-runner/` exists with tests, run `pytest services/tee-runner`.
3. If individual packages have test scripts, run them via `pnpm --filter <pkg> test`.
4. Capture exit codes and summarize failures.

## Output format

### Results
| Suite | Command | Status | Notes |
| ----- | ------- | ------ | ----- |

### Summary
- Total suites run
- Passed / failed / skipped
- If no tests exist yet, state that clearly and point to the active phase in `progress/`

### Failures
For each failure: test name, error message, suggested fix

Arguments: $ARGUMENTS
