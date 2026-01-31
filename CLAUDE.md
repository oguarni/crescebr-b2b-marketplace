# CresceBR - B2B Marketplace

## Language Configuration

**Always use English** for:
- Code comments and documentation
- Commit messages
- Variable and function names
- All generated content

---

## Overview

B2B Marketplace connecting buyer and supplier companies with quotation system, order management, and CNPJ verification.

## Architecture

```
CresceBR/
├── frontend/       # React 19 + TypeScript + Vite + MUI
├── backend/        # Node.js + Express 5 + PostgreSQL + Sequelize
├── shared/         # Shared TypeScript types
└── docker-compose.yml
```

### Current Pattern: Simplified Layered Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      ROUTES + MIDDLEWARE                     │
│              (auth, rbac, validation, rate-limit)            │
├─────────────────────────────────────────────────────────────┤
│                        CONTROLLERS                           │
│         HTTP request/response handling ONLY                  │
├─────────────────────────────────────────────────────────────┤
│                         SERVICES                             │
│         ALL business logic and orchestration                 │
├─────────────────────────────────────────────────────────────┤
│                       REPOSITORIES                           │
│         Data access patterns and queries                     │
├─────────────────────────────────────────────────────────────┤
│                    MODELS (Sequelize ORM)                    │
│         Schema definitions and associations                  │
└─────────────────────────────────────────────────────────────┘
```

---

## Architectural Principles (MANDATORY)

### KISS (Keep It Simple, Stupid)
- No unnecessary abstractions
- Avoid patterns that don't provide immediate value
- Prefer simple solutions over "enterprise" patterns

### YAGNI (You Aren't Gonna Need It)
- Don't add features or abstractions for hypothetical future needs
- Build what's needed NOW
- Refactor when requirements actually change

### DRY (Don't Repeat Yourself)
- Extract repeated code into shared utilities
- Use repositories for repeated query patterns
- Centralize validation rules

### Separation of Concerns
- Controllers: HTTP handling ONLY (no business logic)
- Services: Business logic and orchestration
- Repositories: Data access patterns
- Middleware: Cross-cutting concerns (auth, validation, logging)

---

## Quick Setup

```bash
# Install dependencies
npm run setup

# Development (frontend + backend)
npm run dev

# With Docker
docker-compose up -d
```

## Workspace Commands

```bash
npm run dev          # Start frontend (5173) and backend (3001)
npm run build        # Production build
npm run test         # Run tests in all subprojects
npm run lint         # Lint all subprojects
npm run clean        # Remove node_modules and dist
```

## Ports

| Service    | Port  | URL                          |
|------------|-------|------------------------------|
| Frontend   | 5173  | http://localhost:5173        |
| Backend    | 3001  | http://localhost:3001/api    |
| PostgreSQL | 5432  | localhost:5432               |

## Environment Variables

Copy `.env.example` to `.env` and configure:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for tokens
- `VITE_API_URL` - API URL for frontend

## Test Accounts

```
Admin:     admin@crescebr.com / admin123
Supplier:  supplier@example.com / supplier123
Buyer:     buyer@example.com / buyer123
```

## Conventions

### Git
- Main branch: `main`
- Feature branches: `feature/<feature-name>`
- Bug fix branches: `fix/<bug-name>`
- Documentation branches: `docs/<description>`
- Refactor branches: `refactor/<description>`
- Commits in English, descriptive and concise

### Code
- TypeScript strict mode across the project
- ESLint + Prettier for formatting
- Tests required before merging to main

## Main Endpoints

- `POST /api/auth/login` - Authentication
- `GET /api/products` - List products
- `POST /api/quotations` - Create quotation
- `GET /api/orders` - List orders
- `GET /api/admin/dashboard` - Admin dashboard

---

## Refactoring Status

See individual CLAUDE.md files in `backend/` and `frontend/` for detailed refactoring tasks.

### Priority Order
1. **Backend refactoring** (higher impact on maintainability)
2. **Frontend refactoring** (lower priority, mostly hooks extraction)

### Validation After Refactoring
After completing any refactoring task:
1. Run `npm run test` - All tests must pass
2. Run `npm run lint` - No linting errors
3. Run `npm run build` - Build must succeed
4. Manual test: Login with each role and verify core flows work
