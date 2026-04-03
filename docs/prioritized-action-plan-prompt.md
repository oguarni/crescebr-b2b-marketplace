# Prioritized Action Plan Prompt — CresceBR B2B Marketplace

> Copy-paste the prompt block below into Claude Code (or any LLM session) with the project loaded.

---

## The Prompt

```
You are auditing the CresceBR B2B Marketplace — a monorepo with 3 workspaces:

- **backend/** — Node.js + Express 5.1 + TypeScript 5.8 + Sequelize 6 + PostgreSQL + Jest 30
- **frontend/** — React 19 + TypeScript 5.8 + Vite 7 + MUI 7 + Vitest 3.2
- **shared/** — Shared TypeScript types

Architecture: Simplified Layered (Routes → Controllers → Services → Repositories → Models).
Architectural principles enforced: KISS, YAGNI, DRY, Separation of Concerns.

## Context: Current State

Read these files FIRST before doing any analysis:
- `CLAUDE.md` (root) — project overview, ports, known issues, custom commands
- `backend/CLAUDE.md` — refactoring phases (1-5), code patterns, known build/test errors
- `frontend/CLAUDE.md` — refactoring phases (1-5), hooks extraction, test coverage
- `backend/src/middleware/CLAUDE.md` — RBAC engine, 17 permissions, 3 roles, rate limiting
- `backend/src/__tests__/CLAUDE.md` — coverage report, zero-coverage files

Also read `docs/prioritized-action-plan.md` for previously identified and resolved issues.

Known resolved issues (do NOT re-discover these):
1. CI workflow fixed (cache paths, workspace install, shared types build)
2. `backend/.env.test` untracked from git
3. npm audit fix applied
4. Backend lint errors fixed (ratingsService.test.ts `fail`, unused params)
5. Frontend lint errors fixed (unused imports, `any` types)
6. Frontend test failures fixed (timeouts, label mismatches)
7. JWT hardening (explicit HS256 algorithm)
8. Frontend type safety and error handling utilities added
9. Service extraction for auth, orders, admin completed
10. Frontend hooks adoption across pages completed

Known open issues (rank and action these):
1. 8/9 services bypass repository layer — `order.repository.ts` is dead code
2. `authController.ts` has 4x identical `generateTokenPair` payload construction
3. Bundle size: `AdminTransactionMonitoringPage` 338KB, `index.js` 529KB
4. Legacy role guards (`isAdmin`/`isSupplier`/`isCustomer`) in `auth.ts` overlap with `rbac.ts`
5. 36 npm audit findings remain (1 critical in form-data, 20 high)

## Task: 4-Step Audit, then Prioritized Action Plan

### Step 1 — Security & Stability Scan
Scan for: exposed secrets, unprotected routes, missing input validation, SQL injection vectors,
header leaks, CORS misconfiguration, weak JWT settings, missing rate limits on sensitive endpoints.
Reference `backend/src/middleware/CLAUDE.md` for the RBAC permission matrix.

### Step 2 — Build & Test Health
Run mentally (or actually):
- `npm run build` — check for TypeScript compilation errors
- Backend tests: note overall pass rate and any failing suites
- Frontend tests: note overall pass rate and any failing suites
Identify root causes, not just symptoms.

### Step 3 — Architecture & Code Quality
Check alignment with CLAUDE.md target architecture:
- Controllers doing HTTP-only? Or still containing business logic / direct Model access?
- Services containing all business logic?
- Repositories used consistently?
- Validators extracted and wired through routes?
- Frontend pages using custom hooks or still inline data fetching?
Flag any violations of KISS/YAGNI/DRY principles.

### Step 4 — Dependency & Configuration Audit
- `npm audit` — severity HIGH+ items
- Outdated dependencies with breaking changes
- Missing or misconfigured env vars
- Docker configuration issues

---

## Output Format: Prioritized Action Plan

Rank ALL findings from Steps 1–4 into a single table:

| # | Priority | Domain | Issue | Impact | Effort | Action | Delegatable? |
|---|----------|--------|-------|--------|--------|--------|--------------|
| 1 | P0-Critical | Security | [description] | [what breaks] | Low/Med/High | [concrete fix] | No — requires design decisions |
| 2 | P1-High | Testing | [description] | [what breaks] | Low/Med/High | [concrete fix] | Yes — mechanical |
| ... | ... | ... | ... | ... | ... | ... | ... |

### Priority Definitions

- **P0-Critical**: Security vulnerabilities, data loss risks, broken builds, production blockers
- **P1-High**: Missing tests on critical paths, architectural violations that compound, failing CI
- **P2-Medium**: Coverage gaps, outdated deps, code smells, incomplete refactoring phases
- **P3-Low**: Nice-to-haves, minor inconsistencies, cosmetic issues

### Domain Values
Use: `Security`, `Build`, `Testing`, `Architecture`, `Dependencies`, `Configuration`, `Frontend`, `Backend`

### Effort Calibration
- **Low**: < 30 min, single file, mechanical change
- **Medium**: 1–3 hours, multiple files, requires understanding context
- **High**: 3+ hours, cross-cutting, requires design decisions

---

## Delegation Boundary

**You (expensive model) handle:**
- This analysis and the action plan itself
- Architecture decisions and design trade-offs
- CLAUDE.md content updates
- Custom command definitions
- Complex refactoring plans that require understanding multiple files
- Security remediation strategies

**Cheaper model handles:**
- Mechanical code generation from YOUR templates
- Writing test files from patterns in `backend/src/__tests__/CLAUDE.md`
- Validator boilerplate following `backend/src/validators/` patterns
- Hook implementations following `frontend/src/hooks/` patterns
- Repetitive refactors (removing inline role checks from N controllers)
- Fixing type errors with obvious solutions

For each delegatable item, output a self-contained instruction block under
`## Delegated Task Queue` at the END of your output.

Each block MUST include:

### Task D-{N}: {Title} (references Action Plan #{row})

- **Target file(s)**: exact path(s)
- **Pattern to follow**: paste the EXACT code pattern from the relevant CLAUDE.md — the delegate must NOT need to read other files
- **What to do**: step-by-step instructions a junior dev could follow
- **Acceptance criteria**: what "done" looks like (e.g., "file compiles, exports X, has Y lines")
- **Verification command**: the exact shell command to confirm it works
  ```bash
  cd backend && npm run build && NODE_ENV=test npx jest --testPathPattern="<pattern>" --runInBand --forceExit
  ```

DO NOT delegate anything that requires:
- Reading multiple files to understand context
- Making architectural choices between alternatives
- Modifying CLAUDE.md files
- Security-sensitive changes (auth, RBAC, JWT)
```
