import { Hono } from 'hono'
import { z } from 'zod'
import { CATALOG, CATEGORIES, CITIES, OCCASIONS, RECIPIENTS, COLLECTIONS, MERCHANTS, PRODUCTS, inCategory, REVIEW_POOL } from '../../../src/data/catalog'
import { AGE_GROUPS, INTERESTS, RELATIONSHIPS, fitsAge } from '../../../src/lib/ai'
import { SLOTS, STATUS_FLOW, PAYMENT_METHODS, DELIVERY_PER_MERCHANT } from '../../../src/lib/model'
import { type AppEnv, v } from '../lib/http'
import { E } from '../lib/errors'
import { zCategory, zCity, zCollection, zOccasion, zRecipient, zAge } from '../lib/schemas'
import { assetBase, config } from '../config'
import { catalogVersion, isListed, isMerchantActive, merchantState, productFromCache, publicProduct, queryProducts } from '../services/catalog'

const publicMerchant = (id: string) => {
  const m = MERCHANTS.find((x) => x.id === id)!
  const st = merchantState.get(id)
  return { ...m, status: st?.status ?? 'pending', isPlaceholder: !!st?.isPlaceholder, productCount: PRODUCTS.filter((p) => p.merchant === id).length }
}

export function meta() {
  return {
    categories: CATEGORIES.map((c) => ({ ...c, image: c.art.img ? `${assetBase()}products/${c.art.img}.webp` : null })),
    collections: COLLECTIONS.map(({ match: _m, ...c }) => ({ ...c, image: `${assetBase()}products/${c.img}.webp` })),
    cities: CITIES, occasions: OCCASIONS, recipients: RECIPIENTS,
    ageGroups: AGE_GROUPS, interests: INTERESTS, relationships: RELATIONSHIPS,
    slots: SLOTS, statusFlow: STATUS_FLOW, paymentMethods: PAYMENT_METHODS,
    deliveryFeePerMerchant: DELIVERY_PER_MERCHANT, currency: 'SAR',
    assetBaseUrl: assetBase(),
    /** Development only: the fixed OTP so demo screens can show it. Never set in production. */
    devOtpCode: config.NODE_ENV !== 'production' ? config.OTP_DEV_CODE ?? null : null,
  }
}

export const catalogRoutes = new Hono<AppEnv>()
  .get('/meta', (c) => c.json(meta()))

  /** Everything a client needs to render the storefront in one request (cache with ETag). */
  .get('/catalog/bootstrap', (c) => {
    const etag = `W/"catalog-${catalogVersion()}"`
    if (c.req.header('if-none-match') === etag) return c.body(null, 304)
    c.header('ETag', etag)
    c.header('Cache-Control', 'no-cache')
    return c.json({
      version: catalogVersion(),
      ...meta(),
      // All stores (with status) so order history can always resolve its merchant; clients list only active ones.
      merchants: MERCHANTS.map((m) => publicMerchant(m.id)),
      products: PRODUCTS.map(publicProduct),
      /** Unlisted products (archived, hidden or from inactive stores) — for rendering order history only. */
      archived: CATALOG.filter((p) => !isListed(p)).map((p) => ({ ...publicProduct(p), available: false })),
      reviews: REVIEW_POOL,
    })
  })

  .get('/categories', (c) => c.json({ items: meta().categories.map((cat) => ({ ...cat, productCount: PRODUCTS.filter((p) => inCategory(p, cat.id)).length })) }))

  .get('/products', v('query', z.object({
    cat: zCategory.optional(), for: zCollection.optional(), merchant: z.string().max(64).optional(), city: zCity.optional(),
    occasion: zOccasion.optional(), recipient: zRecipient.optional(), age: zAge.optional(),
    q: z.string().trim().max(100).optional(), min: z.coerce.number().min(0).optional(), max: z.coerce.number().min(0).optional(),
    sameDay: z.enum(['1', 'true']).optional(), ids: z.string().max(2000).optional(),
    sort: z.enum(['popular', 'new', 'price-asc', 'price-desc', 'rating']).optional(),
    page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(24),
  })), (c) => {
    const q = c.req.valid('query')
    return c.json(queryProducts({ ...q, sameDay: !!q.sameDay, ids: q.ids?.split(',').filter(Boolean), cat: q.cat as never, for: q.for as never, city: q.city as never }))
  })

  .get('/products/:id', (c) => {
    const p = productFromCache(c.req.param('id'))
    if (!p || p.hidden || merchantState.get(p.merchant)?.status === 'suspended') throw E.notFound('product')
    const related = PRODUCTS.filter((x) => x.id !== p.id && (x.cat === p.cat || inCategory(x, p.cat)) && (!p.ages || p.ages.some((a) => fitsAge(x, a))))
      .sort((a, b) => b.rating * b.reviews - a.rating * a.reviews).slice(0, 8)
    return c.json({ product: publicProduct(p), merchant: publicMerchant(p.merchant), related: related.map(publicProduct) })
  })

  .get('/merchants', v('query', z.object({ city: zCity.optional(), cat: zCategory.optional() })), (c) => {
    const { city, cat } = c.req.valid('query')
    const items = MERCHANTS.filter((m) => isMerchantActive(m.id) && (!city || m.cities.includes(city as never)) && (!cat || m.cats.includes(cat)))
    return c.json({ items: items.map((m) => publicMerchant(m.id)) })
  })

  .get('/merchants/:id', (c) => {
    const id = c.req.param('id')
    if (!MERCHANTS.some((m) => m.id === id) || merchantState.get(id)?.status === 'suspended') throw E.notFound('merchant')
    return c.json({ merchant: publicMerchant(id), products: PRODUCTS.filter((p) => p.merchant === id).map(publicProduct) })
  })
