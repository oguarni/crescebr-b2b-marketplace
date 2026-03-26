Check the status of backend refactoring phases defined in `backend/CLAUDE.md`.

## Steps

1. **Read** `backend/CLAUDE.md` to identify all refactoring phases and their documented status.

2. **Phase 3 (RBAC dedup)** — Check if inline role checks still exist in controllers:
   - Search for `userRole !==`, `role !==`, `req.user.role`, `req.user?.role` in `backend/src/controllers/`
   - Search for imports of `isAdmin`, `isSupplier`, `isCustomer` from auth.ts in `backend/src/routes/`
   - If found, Phase 3 is NOT COMPLETE

3. **Phase 4 (Service extraction)** — Check if controllers still call models directly:
   - Search for `.findByPk(`, `.findAll(`, `.findOne(`, `.create(`, `.update(`, `.destroy(` in `backend/src/controllers/`
   - Exclude test files
   - If found, list which controllers still have direct model access

4. **Phase 5 (Injectable classes)** — Check if QuoteService uses static methods:
   - Search for `static async` in `backend/src/services/quoteService.ts`
   - If found, Phase 5 is NOT COMPLETE

5. **Report** as a table:

| Phase | Description | Status | Anti-patterns Found |
|-------|-------------|--------|---------------------|

## Arguments

- `$ARGUMENTS` - Optional: phase number (3, 4, or 5) to check only that phase
