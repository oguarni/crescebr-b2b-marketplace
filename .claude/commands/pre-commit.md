Run full validation suite before committing changes.

## Steps

1. **Lint**: Run `npm run lint` in both backend/ and frontend/. Must pass with zero errors.
2. **Build**: Run `npm run build` in root. Must succeed.
3. **Backend tests**: Run `cd backend && NODE_ENV=test node --max-old-space-size=4096 ../node_modules/.bin/jest --runInBand --forceExit --detectOpenHandles`. All tests must pass.
4. **Frontend tests**: Run `cd frontend && npx vitest run`. All tests must pass (flaky tests count as pass if they pass on retry).
5. **Type check**: Verify no TypeScript errors in build output.

## Report

Present results as a go/no-go checklist:

- [ ] Lint: backend (0 errors)
- [ ] Lint: frontend (0 errors)
- [ ] Build: success
- [ ] Backend tests: X/X pass
- [ ] Frontend tests: X/X pass

## Rules

- All 5 checks must pass for a "go" recommendation
- If any check fails, report the failure details and suggest fixes
- Do NOT proceed with commit if any check fails
