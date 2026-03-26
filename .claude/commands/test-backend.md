Run backend tests with coverage and report results.

## Steps

1. Run: `cd backend && NODE_ENV=test npx jest --coverage --runInBand --forceExit --detectOpenHandles`
2. Report:
   - Pass/fail summary
   - Any failing tests with error messages
   - Coverage table focusing on files below 50%
   - Recommendations for improving coverage

## Arguments

- `$ARGUMENTS` - Optional: specific test file pattern (e.g., "auth" to run only auth tests)

If arguments provided, run: `cd backend && NODE_ENV=test npx jest --coverage --runInBand --forceExit --detectOpenHandles --testPathPattern "$ARGUMENTS"`
