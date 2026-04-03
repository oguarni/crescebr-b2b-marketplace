# CresceBR B2B Marketplace — Prioritized Action Plan

Generated: 2026-03-27
Updated: 2026-04-02

## Status Overview

| Priority     | Total | Resolved | Open |
| ------------ | ----- | -------- | ---- |
| P0-Critical  | 5     | 5        | 0    |
| P1-High      | 8     | 6        | 2    |
| P2-Medium    | 9     | 9        | 0    |
| P3-Low       | 7     | 7        | 0    |

## Completed Work (D-series, March 2026)

The following tasks were resolved through delegation batches D-0 through D-5:

- **D-0**: Untracked `backend/.env.test` from git (security)
- **D-1**: Fixed CI workflow (`cache-dependency-path`, workspace install, shared types build)
- **D-2**: Ran `npm audit fix` to reduce vulnerabilities
- **D-3**: Fixed 10 backend lint errors (ratingsService.test.ts `fail`, unused params, stale directive)
- **D-4**: Fixed 38 frontend lint errors (unused imports, `any` types)
- **D-5**: Fixed 45 failing frontend tests and added `testTimeout`

P2 (service extraction, Phase 3, frontend hooks) and P3 (JWT hardening, types, error handling) were completed in the March 27 audit session.

## Remaining Open Items

### P1-High

| # | Domain | Issue | Action |
|---|--------|-------|--------|
| 1 | Architecture | 8/9 services bypass repository layer; `order.repository.ts` is dead code | Remove dead repository file; evaluate whether remaining services need repository extraction or if direct model access is acceptable for this project's scale |
| 2 | Code Quality | `authController.ts` has 4x identical `generateTokenPair` payload construction | Extract `buildTokenPayload` helper (D-7 from delegation prompt, not yet executed) |

### Backlog (not prioritized)

- **Bundle size**: `AdminTransactionMonitoringPage` 338KB, `index.js` 529KB — lazy-load admin pages (D-8)
- **Legacy role guards**: `isAdmin`/`isSupplier`/`isCustomer` in `auth.ts` overlap with `rbac.ts` — remove after confirming no imports (D-9)
- **Vulnerabilities**: 36 npm audit findings remain (1 critical in form-data, 20 high) — most require upstream patches

## Delegation Reference

Tasks D-6 through D-9 are defined in [`delegation-prompt-sonnet.md`](delegation-prompt-sonnet.md) with full acceptance criteria and verification commands. They are self-contained and can be executed independently.
