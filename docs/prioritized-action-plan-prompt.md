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
- `backend/src/__tests__/CLAUDE.md` — coverage report (94.16% overall), zero-coverage files

Known issues already documented (do NOT re-discover these, just rank them):
1. TS error: `productsService.ts:264,293` — null assigned to non-nullable imageUrl
2. Test compile: `quotationsController.test.ts:1066` — TS2345 mock type mismatch → 0% coverage on quotationsController
3. Frontend: 12 failing tests across 6 suites (timeouts, label mismatches)
4. Security: in-memory rate limiter, X-User-Permissions header leak, duplicate role guards in auth.ts/rbac.ts
5. Dependencies: `validator` npm HIGH severity CVE; engine constraint was `>=16` (now `>=20`)
6. Architecture: authController + ordersController still have direct Model access (Phase 4 incomplete)

Refactoring status:
- Backend Phase 1 (Repositories): ✅ DONE
- Backend Phase 2 (Validators): ✅ DONE
- Backend Phase 3 (Remove redundant auth checks): 🔲 NOT STARTED
- Backend Phase 4 (Service extraction): ⚠️ PARTIAL — auth + orders controllers still have direct Model access
- Backend Phase 5 (Injectable classes): 🔲 NOT STARTED
- Frontend Phase 1 (Custom hooks): ✅ DONE
- Frontend Phase 2 (Use hooks in pages): 🔲 NEEDS VERIFICATION
- Frontend Phase 3 (Reusable UI components): ✅ DONE
- Frontend Phase 4 (Type safety): 🔲 NOT STARTED
- Frontend Phase 5 (Error handling): 🔲 NOT STARTED

## Task: 4-Step Audit, then Prioritized Action Plan

### Step 1 — Security & Stability Scan
Scan for: exposed secrets, unprotected routes, missing input validation, SQL injection vectors,
header leaks, CORS misconfiguration, weak JWT settings, missing rate limits on sensitive endpoints.
Reference `backend/src/middleware/CLAUDE.md` for the RBAC permission matrix.

### Step 2 — Build & Test Health
Run mentally (or actually):
- `npm run build` — check for TypeScript compilation errors
- Backend tests: note the 1 compile-failing suite + overall pass rate
- Frontend tests: note the 12 failures across 6 suites
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
- Custom command definitions (`.claude/commands/*.md`)
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
