# Shared Types

> For global rules, see root [CLAUDE.md](../CLAUDE.md).

## Purpose

Cross-project TypeScript type definitions shared between `frontend/` and `backend/`. Imported as `@shared/types` via workspace alias.

## File Structure

```
shared/
├── types.ts        # All shared interfaces and enums
├── index.ts        # Re-exports from types.ts
├── tsconfig.json   # TypeScript config
└── package.json    # Workspace package
```

## Type Domains

| Domain    | Types                                              |
| --------- | -------------------------------------------------- |
| Auth      | `AuthTokenPayload`, `LoginRequest`, `AuthResponse` |
| Company   | `Company` (extends User with CNPJ, certifications) |
| Products  | `Product` (with tier pricing, specifications)      |
| Quotation | `Quotation`, `QuotationItem`                       |
| Orders    | `Order`, `OrderItem`, `OrderStatusHistory`         |
| Ratings   | `Rating`                                           |

## Rules

1. **All types used by both frontend and backend go here** — never duplicate type definitions
2. **Backend-only types** (e.g., Sequelize model attributes) stay in `backend/src/types/`
3. **Frontend-only types** (e.g., form data, UI state) stay in `frontend/src/types/`
4. **Changes here affect both projects** — run `npm run build` at root after modifying
5. **Use strict types** — avoid `any`, prefer explicit interfaces
6. **Keep flat** — no subdirectories, all types in `types.ts`
