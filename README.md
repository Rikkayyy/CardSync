# CardSync

A unified view of spending across every card and bank account you have — built to solve a specific, personal problem: juggling 3-4 separate banking apps to answer "how much have I actually spent today? This week? This month?"

CardSync connects to your accounts via [Plaid](https://plaid.com), pulls transactions from every linked institution, and reconciles them into one consistent picture. The core value isn't the dashboard — it's the reconciliation layer underneath it: detecting transfers between your own accounts so they don't get double-counted as spend, and normalizing categorization across institutions that don't agree with themselves on what a merchant even *is*.

## Why this exists

Plaid's own data is messier than it looks. The same merchant shows up under different names and different categories depending on which bank reported it — "Preply Inc." tagged `OTHER` on one card and `GENERAL_SERVICES` on another, a credit card payment counted as spend even though it's just money moving between your own accounts. Most Plaid-based portfolio projects stop at "list the transactions." CardSync's actual point is the layer that cleans that up before you ever see a number.

## Features

- **Multi-account aggregation** — link any number of accounts across institutions via Plaid Link, one unified transaction feed.
- **Transfer detection** — matches transactions across your own accounts by amount, opposite sign, and a timing window, so paying off a credit card isn't counted as new spending. Catches cases Plaid's own category taxonomy misses.
- **Merchant/category reconciliation** — canonicalizes raw merchant names (strips POS prefixes, store numbers, casing noise) and majority-votes a consistent category across every occurrence of the same real-world merchant, self-healing older data on each sync.
- **Custom category groups** — group merchants under your own labels (e.g. all coffee shops into "Coffee & Tea"), layered on top of the reconciled data rather than replacing it.
- **Spend summary & trend** — running totals for today/this week/this month, a category breakdown, and a day/week/month spend trend chart.
- **Bank-grade-adjacent security practices** — see [Security](#security) below.

## Tech stack

| Layer | Stack |
|---|---|
| Frontend | React + TypeScript + Vite (client-rendered SPA), Tailwind CSS, react-router-dom |
| Backend | Java 21, Spring Boot (REST API, layered controller/service/repository architecture) |
| Database | PostgreSQL via Spring Data JPA + Hibernate |
| Bank data | [Plaid API](https://plaid.com/docs/) via Plaid's Java SDK |
| Auth | Custom Spring Security + JWT (self-implemented — no auth-as-a-service) |

## Architecture

```
                    ┌──────────────┐
   Plaid Link  ───▶ │  Plaid API   │
                    └──────┬───────┘
                           │ transactionsSync (cursor-based, incremental)
                           ▼
              ┌────────────────────────┐
              │   Spring Boot backend    │
              │                          │
              │  TransactionService      │  raw sync + upsert
              │  TransferDetectionService│  matches internal transfers
              │  MerchantNormalizer      │  canonicalizes merchant names
              │  CategoryReconciliation  │  majority-vote category per merchant
              │  CategoryGroupService    │  user-defined category overrides
              └────────────┬─────────────┘
                           │ REST (JWT-authenticated)
                           ▼
              ┌────────────────────────┐
              │   React SPA (Vite)      │
              │   Dashboard, spend      │
              │   summary/trend, groups │
              └────────────────────────┘
```

The frontend holds no business logic — every reconciliation/detection decision happens server-side, so the numbers shown are already correct by the time they reach the browser. See `ARCHITECTURE_DECISIONS.md` (local, not tracked in git) for the full reasoning log behind each of these pieces.

## API surface

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/auth/register`, `/api/auth/login` | Auth |
| POST | `/api/plaid/link-token`, `/api/plaid/exchange-token` | Plaid Link flow |
| GET | `/api/accounts` | Linked accounts |
| POST | `/api/transactions/sync` | Trigger a Plaid sync |
| GET | `/api/transactions` | Transaction list |
| GET | `/api/transactions/summary` | Today/week/month spend + category breakdown |
| GET | `/api/transactions/trend?granularity=DAY\|WEEK\|MONTH` | Spend trend series |
| GET/POST/DELETE | `/api/category-groups/**` | Custom category groups |

## Security

- Passwords hashed with BCrypt; JWTs signed with HMAC, validated on every request via a `OncePerRequestFilter`.
- Plaid access tokens encrypted at rest at the application layer (AES-256-GCM, random IV per value) — not relying on database-level encryption alone.
- Per-IP rate limiting on login/register to blunt credential-stuffing attempts.
- Every data access path is scoped to the authenticated user server-side — no resource is fetchable by guessing an ID belonging to someone else.
- Secrets sourced from environment variables with no committed fallback defaults; a missing secret fails startup loudly rather than silently running insecure.

## Running locally

Requires Docker (for Postgres), Java 21, and Node.

```bash
# 1. Start Postgres (docker-compose.yml is at the repo root)
docker compose up -d

# 2. Start the backend (run.sh sources backend/.env for you)
cd backend
cp .env.example .env   # fill in real values — see comments in the file
./run.sh

# 3. Start the frontend, in a separate terminal
cd ../frontend
echo "VITE_API_URL=http://localhost:8080" > .env.local
npm install && npm run dev
```

Frontend: `http://localhost:3000`. Backend: `http://localhost:8080`.

## Deployment

- `render.yaml` — a Render Blueprint defining the backend (Docker), frontend (static site), and Postgres as code. See `DEPLOYMENT_PLAN_PAAS.md` for the reasoning behind choosing a PaaS over raw cloud infrastructure for a personal-scale deployment.
- `backend/Dockerfile` — multi-stage build (JDK to compile, slim JRE to run), works for any Docker-based host, not just Render.
