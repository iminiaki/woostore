# Lastore

Next.js storefront + Payload CMS 3 admin for a multilingual (`fa`/`en`), multicurrency (`IRT`/`USD`) fashion store.

## Prerequisites

- Node.js `^22.23.5 || ^24.22.3 || >=26.13.1` (Payload requirement)
- Docker Desktop (PostgreSQL)

## Quick start

```bash
# 1. Start Postgres (host port 5433 → container 5432)
npm run db:up

# 2. Install deps (first time)
npm install --legacy-peer-deps

# 3. Copy env if needed
cp .env.example .env

# 4. Seed admin users + catalog from mock data
npm run seed

# 5. Dev server
npm run dev
```

- Storefront: [http://localhost:3000](http://localhost:3000)
- Admin: [http://localhost:3000/admin](http://localhost:3000/admin)
- REST API: [http://localhost:3000/api/products](http://localhost:3000/api/products)

### Seeded logins

| Role         | Email                   | Password    |
|--------------|-------------------------|-------------|
| Admin        | `admin@lastore.local`   | `Admin123!` |
| Shop Manager | `manager@lastore.local` | `Manager123!` |

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run db:up` | Start Postgres via Docker Compose |
| `npm run db:down` | Stop Postgres |
| `npm run seed` | Seed users, settings, catalog from `src/data/mock-data.ts` |
| `npm run generate:types` | Regenerate `src/payload-types.ts` |
| `npm run generate:importmap` | Regenerate admin import map |

## Architecture (Phase 1)

- **Payload 3** embedded in this Next.js app (`/admin` + `/api`)
- **PostgreSQL** in Docker (`localhost:5433`)
- **Local media** in `/media` (swap to S3/R2 later via Payload storage adapter)
- **Roles:** `admin` (full) · `shop-manager` (store ops; no Store Settings)
- **Locales:** `fa` (default), `en`
- **Currencies:** manual `IRT` + `USD` prices per product/variant (no auto FX for catalog)

## Next phases

Customers (phone OTP), cart/checkout, shipping (Iran geo), taxes, payments, invoices, inventory movements, reports, notifications, storefront cutover from mock data.
