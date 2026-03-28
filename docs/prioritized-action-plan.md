# CresceBR B2B Marketplace — Prioritized Action Plan

Generated: 2026-03-27
Updated: 2026-03-27

## Priority Summary

| Priority | Count | Key Items |
|----------|-------|-----------|
| P0-Critical | 5 | Route protection gaps, npm vulns, build error |
| P1-High | 8 | Header leak, IDOR, 0% coverage, authService missing, Docker |
| P2-Medium | 9 | Service extraction, Phase 3, frontend hooks adoption — **COMPLETED** |
| P3-Low | 7 | JWT hardening, types, error handling — **COMPLETED** |

## Execution Order

### Immediate (P0 — do first)
1. Fix route protection: logout, import/stats, import/sample
2. Fix route ordering in quotations routes
3. Run `npm audit fix`
4. Fix productsService.ts imageUrl null error

### This Sprint (P1)
5. Remove X-User-Permissions header
6. Add authorization to quotation/:id and order history routes
7. Fix quotationsController test mock (unblock 0% coverage)
8. Update Dockerfiles to Node 20
9. Fix frontend 12 failing tests
10. Design and create authService.ts

### Next Sprint (P2) — ✅ COMPLETED 2026-03-27
11. ~~Expand adminService, create orderService~~ → Done: authService.ts, orderService.ts, adminService expanded
12. ~~Phase 3: Remove inline role checks~~ → Done: ownership checks moved to services
13. ~~Frontend: Adopt custom hooks in all pages~~ → Done: MyQuotationsPage, MyOrdersPage, QuotationDetailPage, QuoteComparisonPage
14. ~~Frontend: Adopt shared UI components~~ → Already done in Phase 3

### Backlog (P3) — ✅ COMPLETED 2026-03-27
15. ~~JWT hardening (algorithm, expiration validation)~~ → Done: explicit HS256 algorithm in sign/verify
16. ~~Frontend type safety (Phase 4)~~ → Done: src/types/index.ts created
17. ~~Frontend error handling (Phase 5)~~ → Done: src/utils/errorHandler.ts, hooks updated

## Delegation

13 tasks delegatable to cheaper model (see delegated task queue in audit output).
Tasks D-1 through D-13 are self-contained with patterns, acceptance criteria, and verification commands.
