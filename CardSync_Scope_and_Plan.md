# CardSync — App Scope & Plan

## What it is
A personal finance aggregation tool that connects multiple credit/debit cards across different banks via Plaid, giving a single unified view of spending instead of checking each bank's app individually. The core differentiator isn't the dashboard — it's the reconciliation layer: detecting duplicate transactions, matching transfers between your own linked accounts, and normalizing categorization across institutions that don't agree on formatting or category taxonomy.

## Why this project (the real motivation)
Juggling multiple cards across different banks means periodically logging into 3-4 separate dashboards to understand actual spending. CardSync solves that specific, real problem — not a hypothetical one.

## Target audience for this project
Portfolio piece aimed at fintech/banking software roles. The goal is to demonstrate:
- Real API integration experience with a widely-used fintech infrastructure provider (Plaid)
- Security-conscious design (token handling, encryption, data minimization)
- Non-trivial data reconciliation logic — the kind of problem actual fintech engineering teams deal with
- Independent, full-stack ownership (unlike prior team projects)

---

## Tech Stack
- **Frontend:** Next.js, TypeScript, Tailwind CSS — deployed on Vercel, uses SSR/server components for rendering but holds no business logic; all data/API calls go to the Java backend. Route Handlers not used for app logic (Spring Boot is the sole API).
- **Backend:** Java, Spring Boot (REST API, layered architecture — controller/service/repository)
- **Database:** Postgres, accessed via Spring Data JPA + Hibernate
- **Bank data:** Plaid API (Sandbox → Development tier), via Plaid's Java SDK
- **Hosting:** Frontend on Vercel; backend on AWS (ECS or Elastic Beanstalk)
- **Auth:** Custom Spring Security + JWT (self-implemented — password hashing, token issuance/refresh, secured endpoints), separate from Plaid's bank-auth flow

---

## Plaid Integration Plan
- **Sandbox tier** for initial build — fake banks, fake data, no approval needed, unlimited testing.
- **Development tier** once core functionality works — link real personal accounts (small number of live Items, free) for real demo data and screenshots.
- **Production tier** — not needed for this project; explicitly out of scope.

### Security requirements (non-negotiable, and a resume/interview talking point)
- Never touch or store raw bank credentials — Plaid Link handles auth; app only ever receives a token.
- Encrypt Plaid access tokens at rest at the application layer (not relying solely on DB-level encryption).
- Data minimization: store only what's needed for the app's features; avoid hoarding raw transaction history beyond what's actively used.
- Clear separation between "data fetched on demand" vs. "data persisted" — document this decision in the README.

---

## Core Features (MVP — Milestone 1)
Target: functional in 1-2 weekends.

1. Plaid Link flow — connect one or more accounts (Sandbox first, then real accounts in Development)
2. Pull transactions from all linked accounts via Plaid's Transactions API
3. Unified transaction list/dashboard across all linked cards
4. Basic categorization using Plaid's built-in category taxonomy
5. Simple spend summary (by category, by account, by month)

**Honest scope note:** this milestone alone is close to Plaid's own quickstart pattern. It gets something real deployed and demoable, but it is not yet the differentiated part of the project.

## Differentiating Features (Milestone 2 — the actual point of the project)
Target: incremental, over several weekends as time allows.

1. **Transfer detection/deduplication** — identify when a transaction is a transfer between the user's own linked accounts (e.g., paying Card A from Bank B) rather than real spend, and exclude/flag it accordingly.
   - Requires designing matching logic: amount matching, timing windows, handling near-matches that aren't exact (pending vs. posted amounts/timestamps).
2. **Cross-bank categorization normalization** — reconcile category differences between institutions/Plaid categories into a consistent view that reflects how spending is actually being tracked, rather than relying on inconsistent raw categories.
3. **Custom spend-analysis layer** — a lightweight rules/aggregation layer that sits on top of Plaid's default categorization, e.g. custom category grouping, monthly rollups, or (stretch) simple anomaly flagging (e.g., a transaction significantly above a category's historical average).

---

## Explicitly Out of Scope (for now)
- Plaid Production tier / multi-user support
- Bill pay, transfers, or any money-movement functionality (read-only aggregation only)
- Investment/brokerage account support (cards/checking only, to start)
- Mobile app (web only)

---

## Milestone Plan
| Milestone | Scope | Rough timeline |
|---|---|---|
| M1 | Plaid Sandbox integration, Link flow, basic multi-account transaction dashboard | 1-2 weekends |
| M2a | Move to Development tier, link real accounts, real demo data | partial weekend |
| M2b | Transfer detection / dedup logic | 1-2 weekends |
| M2c | Cross-bank categorization normalization + custom spend-analysis layer | 1-2 weekends |
| M3 | README, architecture write-up, deploy, polish for portfolio use | 1 weekend |

**Resume/portfolio readiness checkpoint:** Don't swap this in for existing resume projects until at least M2b is functional and deployed. M1 alone is not sufficiently differentiated from tutorial-shaped Plaid projects.

---

## README / Documentation Plan (for later)
When ready to publish, the README should cover:
- The real problem being solved (multi-bank spend visibility) and why it's personally motivated
- Architecture overview (diagram: Plaid → normalization layer → Supabase → dashboard)
- The transfer-detection/matching algorithm explained in plain language — this is the single most interview-worthy part of the project
- Security design decisions (token encryption, data minimization) called out explicitly
- Screenshots or a short demo GIF
