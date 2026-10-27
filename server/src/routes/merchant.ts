import { Hono } from 'hono'
import { z } from 'zod'
import { and, desc, eq, inArray } from 'drizzle-orm'
import { db, schema } from '../db/client'
import { type AppEnv, v, requireMerchant, userOf } from '../lib/http'
import { zCategory, zCity, zOccasion, zRecipient, zAge, zInterest, zL } from '../lib/schemas'
import { E } from '../lib/errors'
import { toHalalas } from '../lib/money'
import { randomToken } from '../lib/crypto'
import { publish } from '../lib/events'
import { refreshCatalog, rowToMerchant, rowToProduct, publicProduct } from '../services/catalog'
import * as orders from '../services/orders'
import { salesStats } from '../services/stats'
import { sse } from './orders'

const mid = (c: { get: (k: 'merchantId') => string | undefined }) => c.get('merchantId')!

const zVariantGroups = z.array(z.object({
  key: z.string().regex(/^[a-z0-9_-]{1,24}$/),
  label: zL,
  options: z.array(z.object({ id: z.string().regex(/^[a-z0-9_-]{1,24}$/), label: zL, delta: z.number().min(0).max(100000) })).min(1).max(12),
})).max(4)

const zProductInput = z.object({
  name: zL,
  desc: zL,
  category: zCategory,
  extraCategories: z.array(zCategory).max(4).default([]),
  price: z.number().positive().max(100000),
  was: z.number().positive().max(100000).nullable().optional(),
  stock: z.number().int().min(0).max(100000),
  leadHours: z.number().int().min(1).max(24 * 14),
  occasions: z.array(zOccasion).min(1),
  recipients: z.array(zRecipient).min(1),
  ages: z.array(zAge).min(1).nullable().optional(),
  interests: z.array(zInterest).nullable().optional(),
  variants: zVariantGroups.default([]),
  personalize: zL.nullable().optional(),
  imageUrl: z.string().url().max(500).nullable().optional(),
  badge: z.enum(['new', 'best', 'sameday', 'limited']).nullable().optional(),
  active: z.boolean().default(true),
})

function productValues(b: Partial<z.infer<typeof zProductInput>>, existingArt?: typeof schema.products.$inferSelect['art']) {
  const out: Partial<typeof schema.products.$inferInsert> = {}
  if (b.name) { out.nameAr = b.name.ar; out.nameEn = b.name.en }
  if (b.desc) { out.descAr = b.desc.ar; out.descEn = b.desc.en }
  if (b.category) out.category = b.category
  if (b.extraCategories) out.extraCategories = b.extraCategories
  if (b.price !== undefined) out.priceHalalas = toHalalas(b.price)
  if (b.was !== undefined) out.wasHalalas = b.was == null ? null : toHalalas(b.was)
  if (b.stock !== undefined) out.stock = b.stock
  if (b.leadHours !== undefined) out.leadHours = b.leadHours
  if (b.occasions) out.occasions = b.occasions
  if (b.recipients) out.recipients = b.recipients
  if (b.ages !== undefined) out.ages = b.ages ?? null
  if (b.interests !== undefined) out.interests = b.interests ?? null
  if (b.variants) out.variants = b.variants
  if (b.personalize !== undefined) out.personalize = b.personalize ?? null
  if (b.badge !== undefined) out.badge = b.badge ?? null
  if (b.active !== undefined) out.active = b.active
  if (b.imageUrl !== undefined) {
    const art = { ...(existingArt ?? { k: 'giftbox' as const, c: 0 }) }
    if (b.imageUrl) { art.url = b.imageUrl; delete art.img } else delete art.url
    out.art = art
  }
  return out
}

async function catalogChanged() {
  await refreshCatalog()
  await publish({ type: 'catalog.changed', at: new Date().toISOString() })
}

export const merchantRoutes = new Hono<AppEnv>()
  .use(requireMerchant)

  .get('/me', async (c) => {
    const [m] = await db.select().from(schema.merchants).where(eq(schema.merchants.id, mid(c)))
    if (!m) throw E.notFound('merchant')
    return c.json({
      merchant: { ...rowToMerchant(m), status: m.status, isPlaceholder: m.isPlaceholder, contactPhone: m.contactPhone, contactEmail: m.contactEmail, crNumber: m.crNumber },
      stats: await salesStats(30, m.id),
    })
  })
  .patch('/me', v('json', z.object({
    tagline: zL.optional(), about: zL.optional(), prepTime: zL.optional(), cities: z.array(zCity).min(1).optional(),
    contactPhone: z.string().max(20).optional(), contactEmail: z.string().email().max(120).optional(),
  })), async (c) => {
    const b = c.req.valid('json')
    const set: Partial<typeof schema.merchants.$inferInsert> = { updatedAt: new Date() }
    if (b.tagline) { set.taglineAr = b.tagline.ar; set.taglineEn = b.tagline.en }
    if (b.about) { set.aboutAr = b.about.ar; set.aboutEn = b.about.en }
    if (b.prepTime) { set.prepTimeAr = b.prepTime.ar; set.prepTimeEn = b.prepTime.en }
    if (b.cities) set.cities = b.cities
    if (b.contactPhone !== undefined) set.contactPhone = b.contactPhone
    if (b.contactEmail !== undefined) set.contactEmail = b.contactEmail
    const [m] = await db.update(schema.merchants).set(set).where(eq(schema.merchants.id, mid(c))).returning()
    await catalogChanged()
    return c.json({ merchant: rowToMerchant(m) })
  })

  /* ---- orders ---- */
  .get('/orders', v('query', z.object({
    status: z.enum(['placed', 'accepted', 'preparing', 'ready', 'out', 'delivered', 'rejected', 'cancelled', 'open']).optional(),
    limit: z.coerce.number().int().min(1).max(200).default(100),
  })), async (c) => {
    const { status, limit } = c.req.valid('query')
    const where = [eq(schema.subOrders.merchantId, mid(c)), inArray(schema.orders.paymentStatus, ['paid', 'refunded'])]
    if (status === 'open') where.push(inArray(schema.subOrders.status, ['placed', 'accepted', 'preparing', 'ready', 'out']))
    else if (status) where.push(eq(schema.subOrders.status, status))
    const ids = await db.select({ id: schema.orders.id }).from(schema.subOrders)
      .innerJoin(schema.orders, eq(schema.orders.id, schema.subOrders.orderId))
      .where(and(...where)).orderBy(desc(schema.orders.createdAt)).limit(limit)
    return c.json({ items: await orders.loadOrders(ids.map((r) => r.id), 'merchant', mid(c)) })
  })
  .get('/orders/:id', async (c) => {
    const o = await orders.loadOrder(c.req.param('id'), 'merchant', mid(c))
    if (!o || !Object.keys(o.sub).length) throw E.notFound('order')
    return c.json({ order: o })
  })
  .post('/orders/:id/status', v('json', z.object({
    to: z.enum(['accepted', 'preparing', 'ready', 'out', 'delivered', 'rejected']).optional(),
    note: z.string().trim().max(300).optional(),
  })), async (c) => {
    const { to, note } = c.req.valid('json')
    const id = c.req.param('id')
    const r = await orders.setSubStatus(id, mid(c), to, userOf(c).sub, { note })
    return c.json({ ...r, order: await orders.loadOrder(id, 'merchant', mid(c)) })
  })
  .get('/stream', (c) => {
    const m = mid(c)
    return sse(c, (e) => (e.type === 'order.status' && e.merchantId === m) || ((e.type === 'order.paid' || e.type === 'order.cancelled') && e.merchantIds.includes(m)))
  })

  /* ---- products ---- */
  .get('/products', async (c) => {
    const rows = await db.select().from(schema.products).where(and(eq(schema.products.merchantId, mid(c)), eq(schema.products.hidden, false))).orderBy(desc(schema.products.createdAt))
    return c.json({ items: rows.map((r) => ({ ...publicProduct(rowToProduct(r)), active: r.active })) })
  })
  .post('/products', v('json', zProductInput), async (c) => {
    const b = c.req.valid('json')
    const id = `p_${randomToken(8).toLowerCase().replace(/[^a-z0-9]/g, '')}`
    const vals = productValues(b)
    const [row] = await db.insert(schema.products).values({
      ...vals, id, merchantId: mid(c), art: vals.art ?? { k: 'giftbox', c: 0 },
      nameAr: b.name.ar, nameEn: b.name.en, category: b.category, priceHalalas: toHalalas(b.price), stock: b.stock,
    } as typeof schema.products.$inferInsert).returning()
    await catalogChanged()
    return c.json({ product: { ...publicProduct(rowToProduct(row)), active: row.active } }, 201)
  })
  .patch('/products/:id', v('json', zProductInput.partial()), async (c) => {
    const id = c.req.param('id')
    const [cur] = await db.select().from(schema.products).where(and(eq(schema.products.id, id), eq(schema.products.merchantId, mid(c))))
    if (!cur) throw E.notFound('product')
    const [row] = await db.update(schema.products).set({ ...productValues(c.req.valid('json'), cur.art), updatedAt: new Date() }).where(eq(schema.products.id, id)).returning()
    await catalogChanged()
    return c.json({ product: { ...publicProduct(rowToProduct(row)), active: row.active } })
  })
  .delete('/products/:id', async (c) => {
    const r = await db.update(schema.products).set({ active: false, updatedAt: new Date() })
      .where(and(eq(schema.products.id, c.req.param('id')), eq(schema.products.merchantId, mid(c)))).returning({ id: schema.products.id })
    if (!r.length) throw E.notFound('product')
    await catalogChanged()
    return c.json({ ok: true, archived: true })
  })

  /* ---- stats ---- */
  .get('/stats', v('query', z.object({ days: z.coerce.number().int().min(1).max(365).default(30) })), async (c) => {
    return c.json(await salesStats(c.req.valid('query').days, mid(c)))
  })
