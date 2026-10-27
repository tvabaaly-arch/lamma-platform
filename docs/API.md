# LAMMA API reference (v1)

Base URL: `{PUBLIC_API_URL}/api/v1` — locally `http://localhost:8787/api/v1`.

- **Format:** JSON in and out. Money is in **SAR** (numbers, e.g. `199.5`); the database stores halalas.
- **Bilingual text:** every name or label is `{ "ar": "…", "en": "…" }`.
- **Phones:** Saudi mobiles are accepted as `05XXXXXXXX`, `5XXXXXXXX`, `+9665XXXXXXXX` or with Arabic digits, and are returned as `05XXXXXXXX`.
- **Auth:** `Authorization: Bearer <accessToken>`. Access tokens last 30 min; renew them with the refresh token.
- **Product shape:** products use the same shape as the web app's `Product` type (`src/data/catalog.ts`), plus `images: { full, sm }` (absolute URLs) and `available`.
- **Order shape:** orders use the same shape as the web app's `Order` type (`src/lib/model.ts`), plus `status`, `paymentStatus`, `publicToken` (owner only) and `cancelled`.

## Errors

```json
{ "error": { "code": "cart_invalid", "message": "The order cannot be placed — please review the cart", "messageAr": "تعذر إتمام الطلب، راجع السلة", "details": [ … ] } }
```

| Status | Typical codes |
| --- | --- |
| 400 | `validation_error` (details = `[{ path, message }]`), `cart_invalid`, `otp_invalid`, `otp_expired`, `payment_failed` |
| 401 | `unauthorized` (missing, expired or invalid token) |
| 403 | `forbidden` (wrong role) |
| 404 | `not_found` (also returned for other people's orders) |
| 409 | `insufficient_stock`, `invalid_transition`, `cannot_cancel`, `promo_used_up`, `already_reviewed` |
| 429 | `rate_limited` (see the `Retry-After` header) |

Cart and quote problems use these codes: `product_unavailable`, `invalid_variant`, `insufficient_stock`, `city_not_served`, `slot_unavailable`, `invalid_date`, `promo_invalid`, `promo_expired`, `promo_used_up`, `promo_min_subtotal` and `empty_cart`.

## Roles

| Role | Can do |
| --- | --- |
| guest | Browse the catalogue, get quotes, use the gift engine, open tracking or surprise links that carry a token |
| `customer` | Everything a guest can, plus cart, favourites, addresses, saved occasions, placing and paying for orders, cancelling an order before a store accepts it |
| `merchant` | Their own store: profile, products, stock, orders and status updates, stats |
| `admin` | Everything. Can also act as any store on `/merchant/*` by sending `X-Merchant-Id: <storeId>` |

---

## Catalogue (public)

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/health` *(outside `/api/v1`)* | `{ ok, env, providers }` |
| GET | `/meta` | Categories, collections, cities, occasions, recipients, age groups, interests, relationships, delivery slots, status flow, payment methods, delivery fee |
| GET | `/catalog/bootstrap` | Everything needed to render the storefront: `meta` + `merchants` (each with `status`) + `products` (listed) + `archived` (for order history). Supports `ETag`: send it back in `If-None-Match` to get `304` |
| GET | `/categories` | With `productCount` |
| GET | `/products` | Query (all optional): `cat`, `for` (`kids`, `her`, `him`, `baby`, `personalized`), `merchant`, `city`, `occasion`, `recipient`, `age`, `q` (Arabic or English search), `min`, `max`, `sameDay=1`, `ids=a,b`, `sort` (`popular`, `new`, `price-asc`, `price-desc`, `rating`), `page`, `limit` (≤100). Returns `{ total, page, limit, items }` |
| GET | `/products/:id` | `{ product, merchant, related }` |
| GET | `/merchants` | Active stores. Query: `city`, `cat` |
| GET | `/merchants/:id` | `{ merchant, products }` |

## Gift engine (public, rule-based)

All responses include `engine: "rules-v1"`: a transparent rule-based engine, not an external AI model.

| Method | Path | Body |
| --- | --- | --- |
| POST | `/ai/parse` | `{ text }` → `{ brief }` (occasion, recipient, city, budget, age, interests… read from Arabic or English text) |
| POST | `/ai/bundles` | `{ brief }` → `{ bundles: [3], poolNotes }`. Each bundle has `items` (with `product`, `unit`, `reason`), `subtotal`, `notes` |
| POST | `/ai/alternatives` | `{ productId, brief, exclude? }` → swaps for the builder |
| POST | `/ai/suggestions` | `{ brief, exclude? }` → items to add |
| GET | `/ai/messages?occasion=` | Greeting-card suggestions |

`brief` = `{ occasion, recipient, budget (50–50000), city, date?, style? ('', luxe, simple, fun), age?, interests?, relationship?, text? }`.

## Pricing & delivery (public)

| Method | Path | Body |
| --- | --- | --- |
| POST | `/cart/quote` | `{ items: [{ productId, variant, qty, note?, bundle? }], city?, promoCode?, date?, slot? }` → `{ lines, merchants, subtotal, delivery, discount, total, maxLeadHours, promo, problems }` |
| POST | `/delivery/slots` | `{ items, days? }` → bookable slots per day, based on the cart's longest preparation time |
| POST | `/promo/validate` | `{ code, items? }` → `{ valid, promo, discount }` or `{ valid: false, problem }` |

Delivery is SAR 20 per store in the order. The server always recomputes prices and never trusts totals sent by a client.

## Auth

| Method | Path | Body | Returns |
| --- | --- | --- | --- |
| POST | `/auth/otp/request` | `{ phone }` | `{ sent, expiresIn, devMode }`. Limited to 1 request per 30 s and 6 per hour per phone |
| POST | `/auth/otp/verify` | `{ phone, code, name? }` | `{ accessToken, refreshToken, expiresIn, user, isNew }` |
| POST | `/auth/refresh` | `{ refreshToken }` | A new token pair (rotation). Reusing an old refresh token signs out every session of that user |
| POST | `/auth/logout` | `{ refreshToken }` | `{ ok }` |

`user` = `{ id, phone, name, email, role, merchantId, lang }`. Codes expire after 5 minutes and allow 5 attempts.

## Account (customer)

| Method | Path | Notes |
| --- | --- | --- |
| GET / PATCH | `/me` | PATCH `{ name?, email?, lang? }` |
| GET / PUT / DELETE | `/me/cart` | Server cart, shared by web and mobile. PUT `{ items, city?, promoCode? }` returns the quote too |
| GET | `/me/favorites` | `{ ids, products }` |
| PUT / DELETE | `/me/favorites/:productId` | |
| GET / POST | `/me/addresses` | POST `{ label, name, phone, city, district, address? }` |
| DELETE | `/me/addresses/:id` | |
| GET / POST | `/me/occasions` | Reminders. POST `{ title, occasion, recipient?, date (YYYY-MM-DD), yearly?, remindDays?, note? }`. Items include `daysUntil` |
| DELETE | `/me/occasions/:id` | |

## Orders

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/orders` | Checkout (see below). Reserves stock and returns `{ order, payment }` |
| POST | `/orders/:id/pay` | Demo payment provider: confirms payment (nothing is charged). Merchants only see paid orders |
| GET | `/orders` | My orders (newest first) |
| GET | `/orders/:id` | One order (owner only) |
| POST | `/orders/:id/cancel` | Allowed until a store accepts. A paid order is refunded and stock is restored |
| GET | `/orders/:id/stream` | Server-Sent Events for live status (`?access_token=` works for `EventSource`) |
| GET | `/track/:id?token=` | Public tracking link. Hides phone, address and prices |
| GET | `/track/:id/stream?token=` | Live updates for the public link |
| GET | `/surprise/:id?token=` | Digital surprise for the recipient |
| POST | `/surprise/:id/reveal?token=` | Marks the surprise as opened |

Checkout body:

```json
{
  "lines": [{ "productId": "ph01", "variant": { "size": "grand" }, "qty": 1 }],
  "recipient": { "name": "هيفاء", "phone": "0551234567", "city": "riyadh", "district": "حي النرجس", "address": "" },
  "sender": { "name": "نورة" },
  "delivery": { "date": "2026-11-02", "slot": "18:00–22:00" },
  "card": { "design": 0, "message": "كل عام وأنتِ بخير", "from": "نورة", "hidePrice": true },
  "surprise": true,
  "occasion": "birthday",
  "promoCode": "LAMMA10",
  "payment": "mada"
}
```

`payment` is one of `mada`, `apple`, `stc` or `tabby`. `payment` in the response is `{ provider, demo, kind: "confirm", path }` today. A real gateway will return `{ kind: "redirect", url }` instead.

Unpaid orders expire after `UNPAID_ORDER_TTL_MIN` (default 30 min), and their stock is released.

**Order status:** each store moves its own part of an order through `placed → accepted → preparing → ready → out → delivered`. A store can also reject its part from `placed`. The order's overall `status` is the slowest open part. `rejected` and `cancelled` are final.

## Merchant (role `merchant`, or `admin` with `X-Merchant-Id`)

| Method | Path | Notes |
| --- | --- | --- |
| GET / PATCH | `/merchant/me` | Store profile and 30-day stats. PATCH `{ tagline?, about?, prepTime?, cities?, contactPhone?, contactEmail? }` |
| GET | `/merchant/orders?status=` | Paid orders for this store only (their lines and their part). `status` = a step, or `open` |
| GET | `/merchant/orders/:id` | |
| POST | `/merchant/orders/:id/status` | `{ to?, note? }`. If `to` is omitted, the order moves to the next step. `to: "rejected"` restores stock |
| GET | `/merchant/stream` | SSE: new paid orders and status changes |
| GET / POST | `/merchant/products` | POST `{ name, desc, category, extraCategories?, price, was?, stock, leadHours, occasions, recipients, ages?, interests?, variants?, personalize?, imageUrl?, badge?, active? }` |
| PATCH | `/merchant/products/:id` | Any subset of the fields above (e.g. `{ price, stock, active }`) |
| DELETE | `/merchant/products/:id` | Archives the product, which stays in order history |
| GET | `/merchant/stats?days=30` | Gross, commission, delivery fees, payout, daily series, top products, by category |
| POST | `/uploads` | `multipart/form-data` with `file` (JPG, PNG or WebP, up to 5 MB) → `{ url }` to use as `imageUrl` |

## Merchant applications

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/merchant-applications` | Signed-in user applies: `{ storeNameAr, storeNameEn, categories, cities, contactName, phone, email?, crNumber? (10 digits), about? }` |
| GET | `/merchant-applications/mine` | |

Once an admin approves, the applicant's next token refresh carries `role: "merchant"`.

## Admin (role `admin`)

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/admin/stats?days=30` | GMV, discounts, paid orders, customers, take rate, daily series, by city, by store, by category, counts |
| GET | `/admin/merchants?status=&placeholder=` | |
| PATCH | `/admin/merchants/:id` | `{ status?, commission?, isPlaceholder? }` |
| POST | `/admin/merchants/bulk-status` | `{ status, ids? , placeholdersOnly? }`. For example, hide every temporary demo store at once: `{ "status": "suspended", "placeholdersOnly": true }` |
| GET | `/admin/applications?status=` | |
| POST | `/admin/applications/:id/approve` | `{ commission?, merchantId? }`. Creates the store and gives the applicant the merchant role |
| POST | `/admin/applications/:id/reject` | `{ note }` |
| GET | `/admin/orders?payment=&merchant=&q=&limit=` | |
| POST | `/admin/orders/:id/status` | `{ merchantId, to, note? }` (override) |
| POST | `/admin/orders/:id/cancel` | |
| GET | `/admin/users?role=&q=` | |
| PATCH | `/admin/users/:id` | `{ role, merchantId? }` |
| GET | `/admin/promos` | |
| PUT | `/admin/promos/:code` | `{ percent, maxDiscount?, minSubtotal?, usageLimit?, active?, expiresAt? }` |

## Files

- `GET /static/products/<name>.webp` serves the product photography bundled with the web app.
- `GET /uploads/...` serves merchant uploads.
