# LAMMA | لَمّة — Gifting & Celebration Marketplace (Demo)

An Arabic-first (RTL) gifting and celebration marketplace with full English (LTR) support, built as an
investor-ready interactive demo. It covers the complete journey from **occasion → AI gift suggestions →
customisation → cart → checkout → merchant fulfilment → live tracking → digital surprise**.

> **Demo notice:** all merchants, prices, ratings, reviews and orders are fictional. There are no real
> payments, no card data is collected, and no external AI service is called — suggestions come from a
> transparent rule-based engine running on the demo catalogue.

The repository has two parts:

| Part | Folder | What it is |
| --- | --- | --- |
| Web app | `src/`, `public/` | React storefront, Gift Finder and Studio, checkout, tracking, merchant and admin dashboards |
| API | `server/` | Node + PostgreSQL backend: catalogue, phone sign-in, orders split per store, merchant and admin APIs, live updates, gift engine. See [server/README.md](server/README.md) and [docs/API.md](docs/API.md) |

The web app runs in one of two modes:

- **Offline demo** (default, the GitHub Pages build): everything runs in the browser with demo data.
- **Live API** (`npm run dev:api` / `npm run build:api`, or any build with `VITE_API_URL` set):
  - The catalogue, accounts, orders, stock and dashboards come from the API.
  - A merchant's status update reaches the customer's tracking page live.
  - Customers, merchants and admins sign in with their own phone numbers.

## Features

| Area | What it does |
| --- | --- |
| Storefront | Photography-first homepage (hero banner, recipient collections, categories, editor's picks, bundles), shop with filters/search/sort, product pages with variants & personalisation, merchant profiles |
| Categories | Flowers, Cakes, Chocolate, Balloons, Decoration, Desserts, Gift sets, Kids & Toys, Beauty & Skincare, Perfumes & Fragrances, Men's Gifts, Personalized, Lifestyle & Home |
| Collections | For Kids · For Her · For Him · For Baby · Personalized (`/shop?for=…`) |
| Smart Gift Finder | `/finder` — occasion, recipient, age group, relationship, interests, budget & city → 3 combinations; age-safe filtering; interests are never inferred from gender |
| AI Studio | `/studio` — free-text brief parsing (AR/EN), 3 bundles within budget with explained exceptions |
| Celebration Builder | Swap / add / remove / variants / quantity, live totals, budget meter, "fit to budget", table/box/flat-lay preview |
| Checkout | Delivery date & slot respecting prep time, greeting-card designer, digital surprise link, simulated payment, promo `LAMMA10` |
| Tracking & surprise | Per-merchant order status timeline; recipient reveal page `#/surprise/<orderId>` |
| Merchant hub | `/dashboard/merchant` — orders (status actions update customer tracking instantly, also across tabs), products & stock, revenue, commissions, analytics |
| Admin console | `/dashboard/admin` — GMV, take rate, merchant approval/suspension, category & city breakdowns |
| Account | Demo sign-in (OTP `1234`), orders, saved occasions, favourites, language |

## Tech stack

- **Vite 5 + React 18 + TypeScript**
- **Tailwind CSS 3** (brand tokens in `tailwind.config.js`)
- **Framer Motion** (page transitions, reveals, builder animations; respects reduced-motion)
- **Zustand** with a safe `localStorage` wrapper (cart, orders, inventory overrides, favourites)
- **React Router** (`HashRouter`, so the build works on any static host without rewrites)
- Fonts: Readex Pro (display), IBM Plex Sans Arabic (body), Cormorant Garamond (numerals) via Google Fonts

## Getting started

Requirements: **Node.js 18+** and npm.

```bash
npm install
npm run dev            # http://localhost:5173
```

### Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server with HMR (offline demo) |
| `npm run dev:api` | Development server connected to a local API (`.env.api` → `http://localhost:8787`) |
| `npm run build:api` | Production build connected to the API in `.env.api` / `VITE_API_URL` |
| `npm run build` | Type-check (`tsc`) + optimised production build → `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run build:single` | Single self-contained HTML (JS/CSS inlined) → `dist-single/` (images stay as files next to it) |
| `npm run build:artifact` | `build:single` + body-only page for embedded preview hosting → `dist-artifact/` |
| `npm run check:engine` | Runs gift-engine scenarios and checks budget and age-suitability rules |

## Deployment

The production build is fully static. Every asset path is relative (`base: './'`) and routing is
hash-based, so it can be served from any folder or sub-path without rewrite rules.

```bash
npm ci
npm run build          # upload the contents of dist/
```

- **Vercel:** framework *Vite*, build command `npm run build`, output directory `dist`.
- **Netlify:** build command `npm run build`, publish directory `dist`.
- **GitHub Pages:** `.github/workflows/deploy-pages.yml` builds with `BASE_PATH=/lamma-platform/` and deploys on every push to `main`
  (repository *Settings → Pages → Source: GitHub Actions*). Live: https://tvabaaly-arch.github.io/lamma-platform/
- **S3 / any CDN:** upload `dist/` as is.

No environment variables are required.

## Project structure

```
server/                 LAMMA API (see server/README.md)
docs/API.md             API reference for web and mobile clients
public/
  hero/                 Homepage banner (2400w + 1280w WebP)
  products/             Product photography (full + -sm WebP) and manifest.json for the supplied originals
  favicon.svg
src/
  assets-logo.svg       Original LAMMA logo (source file)
  components/           Logo (verbatim brand paths), ProductArt (photo/illustration renderer),
                        Layout (header, cart drawer, search, footer), ProductCard, Charts, GreetingCard, ui kit
  data/catalog.ts       Categories, merchants, products, occasions, recipients, collections (demo data)
  lib/ai.ts             Rule-based brief parser and bundle engine (age, interests, relationship, budget)
  lib/model.ts          Shared order types and pricing rules (used by the web app and the API)
  lib/store.ts          Zustand store: cart, orders, statuses, inventory, favourites
  lib/api.ts, sync.ts   API client and live-API mode (catalogue bootstrap, sessions, live updates)
  pages/                Home, Shop, Occasions, Product, Merchants, Finder, Studio, Checkout,
                        Order/Track, Surprise, Account, MerchantDash, AdminDash
scripts/
  build-artifact.py     Converts the single-file build for embedded previews
  engine-check.ts       Gift-engine scenario checks
  smoke-live.mjs        Post-deploy browser check of the live site (desktop + mobile)
```

## Brand

Palette: Deep Green `#0F3D32` (primary), Warm Gold `#D4A373`, Soft Cream `#F6EDE7`, Blush Pink `#E89B9A`,
Cocoa `#8C5E3C`. The logo is rendered from the supplied SVG paths without modification.

## Image notes

- Product photos under `public/products/` were supplied by LAMMA or generated for the demo. Some supplied
  photos show third-party packaging; confirm usage rights before any public launch.
- Decoration and dessert items still use the built-in illustrations until photography is provided.
- To add a product photo: drop `name.webp` and `name-sm.webp` (600 px) into `public/products/` and set
  `art.img: 'name'` on the product in `src/data/catalog.ts`.
