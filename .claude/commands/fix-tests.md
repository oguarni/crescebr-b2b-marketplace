Fix failing tests in the project.

## Steps

1. Run backend tests: `cd backend && NODE_ENV=test node --max-old-space-size=4096 ../node_modules/.bin/jest --runInBand --forceExit --detectOpenHandles --verbose 2>&1`
2. Run frontend tests: `cd frontend && npx vitest run 2>&1`
3. For each failing test:
   - Read the test file and the source file it tests
   - Identify root cause (test bug vs source bug)
   - Fix the issue
   - Re-run the specific test to verify
4. Run full suite to confirm no regressions

## Rules
- Prefer fixing the source code if the test expectation is correct
- Prefer fixing the test if the source behavior is intentionally changed
- Do NOT skip or delete failing tests without understanding the root cause
