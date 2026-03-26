Run a full project diagnostic covering build, lint, tests, and security. Report findings structured by domain.

## Steps

1. **Build check**: Run `npm run build` in both backend/ and frontend/ directories. Report any TypeScript errors.
2. **Lint check**: Run `npm run lint` in both backend/ and frontend/. Report violations count.
3. **Backend tests**: Run `cd backend && NODE_ENV=test npx jest --coverage --runInBand --forceExit --detectOpenHandles`. Report:
   - Total tests passed/failed
   - Coverage percentages by directory
   - Files with 0% coverage
4. **Frontend tests**: Run `cd frontend && npx vitest run --coverage`. Report:
   - Total tests passed/failed
   - Coverage percentages by directory
   - Files with 0% coverage
5. **Security scan**: Check for:
   - CORS configuration in server.ts
   - Rate limiting presence on all routes
   - RBAC middleware usage on protected routes
   - Input validation on all POST/PUT/PATCH routes
   - Any hardcoded secrets or credentials
6. **Summary**: Present findings as a table with status indicators and recommended actions.
