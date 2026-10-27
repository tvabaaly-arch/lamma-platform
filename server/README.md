# LAMMA API

Backend for the LAMMA marketplace. It handles the catalogue, phone sign-in, carts, orders split per store, merchant and admin dashboards, live order updates and the gift engine. The web app (`../src`) and the future mobile app both use this API.

**Stack:** Node 20+, [Hono](https://hono.dev), PostgreSQL 16 with [Drizzle ORM](https://orm.drizzle.team), Zod validation, JWT access tokens with rotating refresh tokens, Vitest.

The full endpoint list is in **[`../docs/API.md`](../docs/API.md)**.

## Quick start

```bash
# 1. PostgreSQL (any 14+). Example with a local server:
createuser -s lamma 2>/dev/null; psql -c "alter user lamma password 'lamma'"
createdb -O lamma lamma_dev

# 2. API
cd server
cp .env.example .env          # adjust DATABASE_URL if needed
npm install
npm run db:reset              # create tables + demo data (development only)
npm run dev                   # http://localhost:8787  (health: /health)

# 3. Web app against the API (from the repo root, in another terminal)
npm run dev:api               # http://localhost:5173 — uses .env.api (VITE_API_URL)
```

Without `VITE_API_URL`, the web app runs as the self-contained offline demo, which is what GitHub Pages serves.

### Demo accounts (development data)

Sign in with any of these numbers. With `OTP_DEV_CODE=1234` set, the code is always **1234**, and the sign-in page also shows one-tap buttons.

| Role | Phone |
| --- | --- |
| Admin | `0500000001` |
| Store "Al Reem Florals" (`reem`) | `0500000106` |
| Other stores | `05000001NN`, where NN is the store's position 01–15 in `src/data/catalog.ts` (numu = 01 … qamariya = 15) |
| Customers (نورة القحطاني, عبدالله العتيبي, ريم الشهري, …) | `0550000101` – `0550000108` |

**Placeholder data:** all 15 stores are fictional, Saudi-style placeholders. They are flagged `is_placeholder = true`, and the customers and orders are demo records (`is_demo = true`). They will be replaced as real merchants join:

1. Real merchants apply through `POST /merchant-applications`, or an admin creates them.
2. The admin approves each one with `POST /admin/applications/:id/approve`.
3. When ready, the admin hides every placeholder at once with `POST /admin/merchants/bulk-status { "status": "suspended", "placeholdersOnly": true }`.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | API with auto-reload (tsx) |
| `npm run build` / `npm start` | Type-check, bundle to `dist/`, run the bundle. On start it applies migrations, unless `MIGRATE_ON_START=false` |
| `npm test` | 43 API tests against a real database (`lamma_test`, or `TEST_DATABASE_URL`). **Resets that database.** |
| `npm run db:generate` | New SQL migration after editing `src/db/schema.ts` |
| `npm run db:migrate` | Apply migrations |
| `npm run db:seed` | Load demo data into an empty database |
| `npm run db:reset` | Drop everything, migrate and seed (refuses to run in production) |

## Configuration

See `.env.example`.

| Variable | Default | Notes |
| --- | --- | --- |
| `DATABASE_URL` | `postgres://lamma:lamma@localhost:5432/lamma_dev` | |
| `JWT_SECRET` | dev value | **Required in production** (32+ characters) |
| `CORS_ORIGINS` | localhost + GitHub Pages | Comma-separated |
| `PUBLIC_API_URL` | `http://localhost:8787` | Used to build image URLs |
| `ASSET_BASE_URL` | `${PUBLIC_API_URL}/static/` | Where product photos are served. Can point at a CDN |
| `STATIC_DIR` | `../public` | The web app's photos, served at `/static` |
| `UPLOAD_DIR` | `./uploads` | Merchant uploads (local disk) |
| `OTP_DEV_CODE` | none | Fixed sign-in code for development. **Forbidden in production** |
| `SMS_PROVIDER` / `PAYMENT_PROVIDER` | `console` / `demo` | See "Not connected yet" below |
| `ACCESS_TOKEN_TTL_MIN` / `REFRESH_TOKEN_TTL_DAYS` | 30 / 30 | |
| `UNPAID_ORDER_TTL_MIN` | 30 | Unpaid orders then expire and release their stock |

## How it is built

```
src/
  app.ts               Hono app: security headers, CORS, body limit, auth, routes, static files
  index.ts             Server start: migrations, catalogue cache, realtime listener, expiry job
  config.ts            Validated environment
  db/                  schema.ts (16 tables), migrations, seed, reset
  services/
    catalog.ts         Catalogue cache shared with the web app's catalogue and gift engine
    orders.ts          Quote, checkout (atomic stock reservation), payment, status flow, cancel, expiry
    auth.ts            Phone OTP, JWT, refresh-token rotation with reuse detection
    stats.ts           Merchant and admin figures (SQL)
  providers/           sms.ts, payments.ts, storage.ts — swap points for real services
  routes/              catalog, ai, orders, auth/me, account, merchant, admin, applications, uploads
drizzle/               SQL migrations
test/                  API tests (Vitest)
```

- **One source of rules.** The API imports the web app's catalogue types, pricing helpers (`src/lib/model.ts`) and gift engine (`src/lib/ai.ts`), so prices, age-safety, collections and bundles behave the same everywhere.
- **Money** is stored in halalas (integers) and exposed in SAR.
- **Stock** is reserved atomically at checkout (`UPDATE … WHERE stock >= qty`), so the last item can't be sold twice. It is released on cancellation, rejection or payment expiry.
- **Orders** are split into one part per store. Each store sees only its own lines, and each part has a commission and payout.
- **Realtime:** Postgres `LISTEN/NOTIFY` feeds Server-Sent Events, so it works across several API instances.
- **Security:**
  - Prices and totals are always computed on the server.
  - Role checks run on every route, and a customer never sees another customer's order.
  - Tracking and surprise links need a secret per-order token.
  - Sign-in codes are stored hashed, attempts are limited, and there are rate limits.
  - Uploads are checked by file content, not file name.
  - Static files are served without path traversal.

## Not connected yet (deliberately left for later)

| Area | Today | To go live |
| --- | --- | --- |
| SMS | `console` provider prints codes to the server log | Add a provider in `src/providers/sms.ts` (e.g. Unifonic) |
| Payments | `demo` provider: `POST /orders/:id/pay` marks an order paid; nothing is charged | Implement `PaymentProvider` (Moyasar, HyperPay or Tap) with a redirect and a webhook |
| Shipping | Flat SAR 20 per store; stores move orders to "out" and "delivered" themselves | Courier integration |
| Gift engine | Transparent rules (`rules-v1`), no external AI | Optional language-model provider later |
| File storage | Local disk | S3 / R2 in `src/providers/storage.ts` |
| Rate limiting | In memory (one instance) | Redis when running several instances |
