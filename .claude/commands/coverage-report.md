Generate and analyze test coverage for the entire project.

## Steps

1. **Backend coverage**: Run `cd backend && NODE_ENV=test npx jest --coverage --runInBand --forceExit --detectOpenHandles`
2. **Frontend coverage**: Run `cd frontend && npx vitest run --coverage`
3. **Analysis**: For each layer, report:
   - Current coverage percentage
   - Gap analysis (what's not tested)
   - Priority files that need tests (sorted by risk)

## Coverage Targets
- Controllers: 80%+
- Services: 90%+
- Middleware: 80%+
- Repositories: 90%+
- Models: 70%+
- Utils: 80%+

## Output
Present a prioritized list of files needing test coverage, with estimated effort (small/medium/large) for each.
