<p align="center">
  <img src="frontend/public/logo.png" alt="CresceBR Logo" width="450" />
</p>

<p align="center">
  <a href="#visao-geral">🇧🇷 Português</a>&nbsp;&nbsp;|&nbsp;&nbsp;
  <a href="#key-features">🌐 English</a>
</p>

<h1 align="center">CresceBR B2B Marketplace</h1>

<p align="center">
  Industrial procurement platform connecting Brazilian buyers and suppliers through structured quotation workflows.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white" alt="React 19" />
  <img src="https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white" alt="Express 5" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/PostgreSQL-15-4169E1?logo=postgresql&logoColor=white" alt="PostgreSQL 15" />
  <img src="https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white" alt="Docker" />
  <img src="https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-lightgrey" alt="License" />
</p>

---

## Key Features

- **CNPJ Validation** — Real-time company verification via Brasil API
- **Role-based Access** — Buyer, Supplier, and Admin with granular permissions
- **Quotation Engine** — Tier-based volume pricing with automated tax and shipping calculations
- **Order Lifecycle** — Full status tracking from pending to delivered
- **Bulk CSV Import** — Large product catalog ingestion for suppliers
- **Admin Dashboard** — Company verification, analytics, and user management
- **JWT Security** — Token-based auth with Helmet, rate limiting, and bcrypt

---

## Project Structure

```
crescebr-b2b-marketplace/
├── frontend/          # React 19 + TypeScript + Vite + MUI
├── backend/           # Node.js + Express 5 + TypeScript + Sequelize
├── shared/            # Shared TypeScript types
├── docs/              # Design prompts and assets
├── docker-compose.yml
└── package.json       # Workspace root
```

---

## Architecture

### Layered Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  ROUTES + MIDDLEWARE                        │
│           (auth, rbac, validation, rate-limit)              │
├─────────────────────────────────────────────────────────────┤
│                     CONTROLLERS                             │
│              HTTP request/response handling                 │
├─────────────────────────────────────────────────────────────┤
│                      SERVICES                               │
│              Business logic and orchestration               │
├─────────────────────────────────────────────────────────────┤
│                    REPOSITORIES                             │
│              Data access patterns and queries               │
├─────────────────────────────────────────────────────────────┤
│                  MODELS (Sequelize ORM)                     │
│              Schema definitions and associations            │
└─────────────────────────────────────────────────────────────┘
```

### System Diagram

```
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│  React Frontend  │    │ Express Backend  │    │   PostgreSQL     │
│   (Port 5173)    │◄──►│   (Port 3001)    │◄──►│   (Port 5432)    │
└──────────────────┘    └──────────────────┘    └──────────────────┘
                                │
                                ▼
                        ┌──────────────────┐
                        │   Brasil API     │
                        │ CNPJ Validation  │
                        └──────────────────┘
```

---

## Tech Stack

| Layer         | Technology                        |
| ------------- | --------------------------------- |
| Frontend      | React 19, TypeScript, MUI, Vite   |
| Backend       | Node.js, Express 5, TypeScript    |
| Database      | PostgreSQL 15, Sequelize ORM      |
| Auth          | JWT, bcrypt, Helmet               |
| File handling | Multer (CSV import, file uploads) |
| External API  | Brasil API (CNPJ validation)      |
| DevOps        | Docker, Docker Compose            |

---

## Getting Started

### Docker (recommended)

```bash
git clone https://github.com/oguarni/CresceBR.git crescebr-b2b-marketplace
cd crescebr-b2b-marketplace

cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

docker-compose up --build
```

Access: `http://localhost:5173` (frontend) | `http://localhost:3001` (API)

### Local development

```bash
npm run setup   # install all dependencies
npm run dev     # start frontend (5173) + backend (3001) concurrently
```

Prerequisites: Node.js 20+, PostgreSQL 15 running locally.

---

## Demo Credentials

| Role     | Email                | Password    | CNPJ               |
| -------- | -------------------- | ----------- | ------------------ |
| Admin    | admin@crescebr.com   | admin123    | 11.222.333/0001-81 |
| Supplier | supplier@example.com | supplier123 | 12.345.678/0001-90 |
| Buyer    | buyer@example.com    | buyer123    | 98.765.432/0001-10 |

---

## API Reference

### Auth

```
POST /api/auth/register            Register buyer company
POST /api/auth/register-supplier   Register supplier company
POST /api/auth/login               Login
GET  /api/auth/profile             Current user profile
```

### Companies

```
GET  /api/companies                List companies (admin)
PUT  /api/companies/:id/verify     Verify company (admin)
GET  /api/companies/stats          Company statistics (admin)
```

### Products

```
GET    /api/products               List with filters
POST   /api/products               Create (supplier)
PUT    /api/products/:id           Update (supplier)
DELETE /api/products/:id           Delete (supplier)
POST   /api/products/import-csv    Bulk import (supplier)
GET    /api/products/sample-csv    Download CSV template
```

### Quotations

```
POST /api/quotations               Create request (buyer)
GET  /api/quotations               List user quotations
GET  /api/quotations/:id           Quotation details
PUT  /api/quotations/:id           Update status (supplier)
POST /api/quotations/:id/process   Process quotation (supplier)
```

### Orders

```
POST /api/orders                   Create from quotation
GET  /api/orders                   List user orders
GET  /api/orders/:id/history       Order status history
PUT  /api/orders/:id/status        Update status (supplier/admin)
GET  /api/orders/stats             Order statistics (admin)
```

### Admin

```
GET /api/admin/analytics           Dashboard analytics
GET /api/admin/companies           Company management
PUT /api/admin/companies/:id       Update company status
```

---

## Architecture Assessment

| Area            | Status     | Notes                                                 |
| --------------- | ---------- | ----------------------------------------------------- |
| Stack Modernity | Strong     | React 19, Express 5, TypeScript full-stack            |
| Data Layer      | Strong     | PostgreSQL 15 + Sequelize with repository pattern     |
| Security        | Good       | JWT + RBAC + CNPJ validation + rate limiting + Helmet |
| Testing         | Moderate   | 25+ test files; needs E2E expansion                   |
| DevOps          | Needs Work | Docker ready, no CI/CD pipeline                       |
| Observability   | Needs Work | No structured logging or monitoring                   |

**Verdict:** Architecture is solid for MVP and early production. Express 5 + Sequelize + React 19 is modern and viable. PostgreSQL 15 is an excellent fit for the B2B domain.

Recommended next steps:

1. CI/CD pipeline (GitHub Actions)
2. PostgreSQL connection pooling
3. Structured logging (Winston or Pino)
4. Auth middleware consolidation
5. E2E test suite

---

## Development

```bash
npm run dev      # Start frontend + backend
npm run build    # Production build (all)
npm run test     # Run tests in all subprojects
npm run lint     # Lint all subprojects
npm run clean    # Remove node_modules and dist
```

**Backend only:**

```bash
cd backend
npm run dev      # Hot reload dev server
npm run test     # Jest test suite
npm run lint     # ESLint
```

**Frontend only:**

```bash
cd frontend
npm run dev      # Vite dev server
npm run build    # Production build
npm run test     # Vitest suite
```

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -m 'Add my feature'`)
4. Push to the branch (`git push origin feature/my-feature`)
5. Open a Pull Request

---

## License

Licensed under **CC BY-NC-SA 4.0**. See [LICENSE](LICENSE) for details.

---

<h2 id="visao-geral">🇧🇷 Visão Geral</h2>

**CresceBR** é uma plataforma de marketplace B2B para o mercado industrial brasileiro. Conecta empresas compradoras e fornecedoras por meio de um fluxo estruturado de cotações, gestão de pedidos e verificação de CNPJ em tempo real.

### Como executar

```bash
git clone https://github.com/oguarni/CresceBR.git crescebr-b2b-marketplace
cd crescebr-b2b-marketplace
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
docker-compose up --build
```

Acesse: `http://localhost:5173`

### Tecnologias principais

- React 19 + TypeScript (frontend)
- Node.js + Express 5 (backend)
- PostgreSQL 15 + Sequelize (banco de dados)
- JWT + RBAC (autenticação e permissões)
- Docker (containerização)

### Contas de teste

| Perfil     | E-mail               | Senha       |
| ---------- | -------------------- | ----------- |
| Admin      | admin@crescebr.com   | admin123    |
| Fornecedor | supplier@example.com | supplier123 |
| Comprador  | buyer@example.com    | buyer123    |

### Funcionalidades principais

- Validação de CNPJ via Brasil API
- Cotações com precificação por volume
- Catálogo de produtos com importação CSV
- Rastreamento completo do ciclo de pedidos
- Painel administrativo com analytics

---

_CresceBR — Conectando empresas brasileiras._
