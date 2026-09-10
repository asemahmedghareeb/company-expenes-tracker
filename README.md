# Partner Ledger — Dynamic Multi-Partner Financial Accounting

Next.js (App Router) + TypeScript + Tailwind + shadcn-style UI + PostgreSQL + Prisma + Zod.

## Business rules

- **Dynamic partners & flexible splits** — add/deactivate partners any time.
- **Global default equity** must sum to **100%** across active partners (Zod-enforced).
- **Project-level equity override (snapshot)** — on project creation, defaults are
  copied into `ProjectPartner`. Each project can then be adjusted freely
  (e.g. 50/50 between 2 partners). Historic rows **never mutate** when global
  defaults change.
- **Out-of-pocket expenses** — any partner can log an expense (`isReimbursed` flag).
- **Settle expenses first** — client inflow reimburses outstanding expenses before
  net profit is distributed.
- **Realized net profit** = Total inflow − Total operational expenses, split by
  `ProjectPartner.sharePercentage`.
- **Balance** = Pending reimbursements + Realized profit shares − Drawings.

## Quickstart (Neon)

`.env` holds two Neon strings (gitignored — see `.env.example`):
`DATABASE_URL` (pooled, runtime) and `DIRECT_URL` (direct, migrations).
`prisma/schema.prisma` sets `url = env("DATABASE_URL")` + `directUrl = env("DIRECT_URL")`.

```bash
npm install
npx prisma db push      # sync schema to Neon (uses DIRECT_URL)
npm run db:health       # verify: SELECT 1 + table counts via pooled URL
npm run dev             # health endpoint also live at GET /api/health
```

## Quickstart (local Postgres alternative)

```bash
# 1. Database (local Postgres)
docker compose up -d

# 2. Env
copy .env.example .env      # Windows
# cp .env.example .env      # macOS/Linux

# 3. Install + migrate + seed
npm install
npx prisma db push
npm run db:seed

# 4. Run
npm run dev
```

Seed creates 3 partners (50/30/20), 2 projects (one default-split, one custom
50/50), milestone payments, pending + reimbursed expenses, and drawings.

## Structure

| Path | Purpose |
|---|---|
| `prisma/schema.prisma` | `Partner`, `Project`, `ProjectPartner` (snapshot equity), `ClientPayment`, `ProjectExpense` (`isReimbursed`), `PartnerDrawing` |
| `src/lib/validations.ts` | Zod schemas — every split table refined to sum exactly 100% |
| `src/lib/ledger.ts` | **Pure** calculation engine (no DB): project financials, settlement plan (reimburse-first), partner ledgers, firm overview |
| `src/actions/partners.ts` | Add/edit partner, activate/deactivate, update default splits |
| `src/actions/projects.ts` | Create project (auto or custom splits), edit, update snapshot splits |
| `src/actions/finance.ts` | Record payment, log expense, mark reimbursed, record drawing |
| `src/actions/queries.ts` | DB reads + ledger computation for pages |
| `src/app/api/...` | REST equivalents (`/partners`, `/projects`, `/transactions?kind=…`, `/ledger`) |
| `src/app/` | Dashboard `/`, `/projects`, `/projects/[id]`, `/partners`, `/ledger` |

## Key endpoints (Server Actions)

- `addPartner` / `editPartner` / `setPartnerActive` / `updateDefaultSplits`
- `createProject` / `updateProject` / `updateProjectSplits`
- `recordClientPayment` / `logProjectExpense` / `markExpenseReimbursed`
- `recordPartnerDrawing`

## Formula

```
netProfit(p)  = Σ clientPayments(p) − Σ expenses(p)
profitShare(partner, p) = netProfit(p) × snapshot%(partner, p) / 100
pending(partner)  = Σ expenses where paidBy=partner AND isReimbursed=false
drawings(partner) = Σ drawings(partner)
balance(partner)  = pending + Σ profitShare − drawings
```
