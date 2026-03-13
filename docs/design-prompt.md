# CresceBR — Frontend Redesign Prompt (Stitch / stitch.withgoogle.com)

Use this prompt in Stitch to generate a coherent frontend redesign for CresceBR.

---

## Prompt

Design a coherent, professional frontend for **CresceBR**, a Brazilian B2B industrial
marketplace built with React 19 and Material UI.

**Design principles:**

- Humble and honest: no hero marketing, no decorative flourishes
- Clarity over decoration: every element earns its place
- Balanced and harmonious: consistent spacing, consistent type scale
- 8px grid throughout
- Accessible: WCAG AA contrast, keyboard-navigable, readable at 14px body size

**Color palette:**

- Primary: Emerald green #2E7D32
- Accent: Warm gold #F9A825
- Surface: White #FFFFFF and light gray #F5F5F5
- Text: Near-black #1A1A1A, secondary #616161
- Error: #C62828

**Typography:**

- Headings: Inter or Roboto, weight 600
- Body: Roboto, weight 400, 14–16px
- Monospace: Roboto Mono (for CNPJ, order IDs, prices)

**Pages to design (all four must share the same visual language):**

### 1. Product Catalog (`/products`)

- Compact card grid (3–4 columns on desktop, 1 on mobile)
- Each card: product image placeholder, name, unit price, supplier name, "Request Quote" button
- Left sidebar: filter by category, price range, supplier
- Top bar: search field, sort dropdown
- No empty states with large illustrations — use short text messages instead

### 2. Quotation Flow (`/quotations/new`)

- Step indicator (3 steps: Select Items → Review Pricing → Confirm)
- Step 1: product list with quantity inputs and running total sidebar
- Step 2: pricing breakdown table (unit price, quantity tier discount, tax, shipping, total)
- Step 3: summary card + submit button
- Error states must be inline, not modal popups

### 3. Supplier Dashboard (`/dashboard/supplier`)

- KPI row: Pending Quotations, Active Orders, Revenue (MTD), Products Listed
- Quotation queue: table with columns Status, Buyer, Products, Value, Actions
- Recent orders: compact list with status badges
- No pie charts — prefer simple number displays or bar sparklines

### 4. Admin Panel (`/admin`)

- Sidebar navigation: Companies, Users, Analytics, Settings
- Company verification queue: table with CNPJ, company name, type, registration date, Approve/Reject actions
- Analytics section: monthly revenue bar chart, order status distribution (simple table, not donut chart)
- User table: email, role, company, last login, status toggle

**Constraints:**

- Use MUI components as the base — do not propose a full component library replacement
- Do not add animations beyond MUI defaults
- Do not add dark mode — single light theme only
- Mobile-first layout for catalog and quotation flow; desktop-first for dashboards
- No onboarding modals, tooltips arrays, or feature tour overlays
