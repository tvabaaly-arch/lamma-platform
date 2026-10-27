import { Hono } from 'hono'
import { z } from 'zod'
import { and, desc, eq } from 'drizzle-orm'
import { db, schema } from '../db/client'
import { type AppEnv, v, requireAuth, userOf } from '../lib/http'
import { zCartItem, zCity, zDate, zOccasion, zRecipient, zPhone } from '../lib/schemas'
import { E } from '../lib/errors'
import { localPhone } from '../lib/phone'
import { productFromCache, publicProduct } from '../services/catalog'
import { quote } from '../services/orders'

const MAX_CART = 40

/** Days until the next occurrence of a (yearly) date, in UTC days. */
function daysUntil(dateIso: string, yearly: boolean, now = new Date()) {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  const [y, m, d] = dateIso.split('-').map(Number)
  let t = Date.UTC(yearly ? now.getUTCFullYear() : y, m - 1, d)
  if (yearly && t < today) t = Date.UTC(now.getUTCFullYear() + 1, m - 1, d)
  return Math.round((t - today) / 86400e3)
}

export const accountRoutes = new Hono<AppEnv>()
  .use(requireAuth())

  /* ---- cart (synced between web and mobile) ---- */
  .get('/cart', async (c) => {
    const [row] = await db.select().from(schema.carts).where(eq(schema.carts.userId, userOf(c).sub))
    const items = row?.items ?? []
    return c.json({ items, quote: await quote(items, {}) })
  })
  .put('/cart', v('json', z.object({ items: z.array(zCartItem).max(MAX_CART), city: zCity.optional(), promoCode: z.string().max(30).optional() })), async (c) => {
    const { items, city, promoCode } = c.req.valid('json')
    const userId = userOf(c).sub
    await db.insert(schema.carts).values({ userId, items, updatedAt: new Date() })
      .onConflictDoUpdate({ target: schema.carts.userId, set: { items, updatedAt: new Date() } })
    return c.json({ items, quote: await quote(items, { city, promoCode }) })
  })
  .delete('/cart', async (c) => {
    await db.delete(schema.carts).where(eq(schema.carts.userId, userOf(c).sub))
    return c.json({ items: [] })
  })

  /* ---- favourites ---- */
  .get('/favorites', async (c) => {
    const rows = await db.select().from(schema.favorites).where(eq(schema.favorites.userId, userOf(c).sub)).orderBy(desc(schema.favorites.createdAt))
    const ids = rows.map((r) => r.productId)
    return c.json({ ids, products: ids.map(productFromCache).filter(Boolean).map((p) => publicProduct(p!)) })
  })
  .put('/favorites/:productId', async (c) => {
    const pid = c.req.param('productId')
    if (!productFromCache(pid)) throw E.notFound('product')
    await db.insert(schema.favorites).values({ userId: userOf(c).sub, productId: pid }).onConflictDoNothing()
    return c.json({ ok: true })
  })
  .delete('/favorites/:productId', async (c) => {
    await db.delete(schema.favorites).where(and(eq(schema.favorites.userId, userOf(c).sub), eq(schema.favorites.productId, c.req.param('productId'))))
    return c.json({ ok: true })
  })

  /* ---- saved addresses ---- */
  .get('/addresses', async (c) => {
    const rows = await db.select().from(schema.addresses).where(eq(schema.addresses.userId, userOf(c).sub)).orderBy(desc(schema.addresses.createdAt))
    return c.json({ items: rows.map((a) => ({ ...a, phone: localPhone(a.phone) })) })
  })
  .post('/addresses', v('json', z.object({
    label: z.string().trim().min(1).max(40), name: z.string().trim().min(2).max(60), phone: zPhone,
    city: zCity, district: z.string().trim().min(2).max(80), address: z.string().trim().max(200).default(''),
  })), async (c) => {
    const userId = userOf(c).sub
    const [a] = await db.insert(schema.addresses).values({ ...c.req.valid('json'), userId }).returning()
    return c.json({ address: { ...a, phone: localPhone(a.phone) } }, 201)
  })
  .delete('/addresses/:id', async (c) => {
    const id = c.req.param('id')
    if (!z.string().uuid().safeParse(id).success) throw E.notFound('address')
    const r = await db.delete(schema.addresses).where(and(eq(schema.addresses.id, id), eq(schema.addresses.userId, userOf(c).sub))).returning({ id: schema.addresses.id })
    if (!r.length) throw E.notFound('address')
    return c.json({ ok: true })
  })

  /* ---- saved occasions (reminders) ---- */
  .get('/occasions', async (c) => {
    const rows = await db.select().from(schema.savedOccasions).where(eq(schema.savedOccasions.userId, userOf(c).sub))
    const items = rows.map((o) => ({ ...o, daysUntil: daysUntil(o.date, o.yearly) })).sort((a, b) => a.daysUntil - b.daysUntil)
    return c.json({ items })
  })
  .post('/occasions', v('json', z.object({
    title: z.string().trim().min(2).max(80), occasion: zOccasion, recipient: zRecipient.optional(), date: zDate,
    yearly: z.boolean().default(true), remindDays: z.number().int().min(0).max(30).default(3), note: z.string().trim().max(300).optional(),
  })), async (c) => {
    const [o] = await db.insert(schema.savedOccasions).values({ ...c.req.valid('json'), userId: userOf(c).sub }).returning()
    return c.json({ occasion: { ...o, daysUntil: daysUntil(o.date, o.yearly) } }, 201)
  })
  .delete('/occasions/:id', async (c) => {
    const id = c.req.param('id')
    if (!z.string().uuid().safeParse(id).success) throw E.notFound('occasion')
    const r = await db.delete(schema.savedOccasions).where(and(eq(schema.savedOccasions.id, id), eq(schema.savedOccasions.userId, userOf(c).sub))).returning({ id: schema.savedOccasions.id })
    if (!r.length) throw E.notFound('occasion')
    return c.json({ ok: true })
  })
