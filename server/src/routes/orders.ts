import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db, schema } from '../db/client'
import { type AppEnv, v, requireAuth, userOf, rateLimit } from '../lib/http'
import { zCartItem, zCity, zDate, zSlot, zOccasion, zPhone, zPaymentMethod } from '../lib/schemas'
import { E } from '../lib/errors'
import { safeEqual } from '../lib/crypto'
import { bus, type LammaEvent } from '../lib/events'
import { payments } from '../providers/payments'
import * as orders from '../services/orders'

const zCreateOrder = z.object({
  lines: z.array(zCartItem).min(1).max(40),
  recipient: z.object({
    name: z.string().trim().min(2).max(60), phone: zPhone, city: zCity,
    district: z.string().trim().min(2).max(80), address: z.string().trim().max(300).default(''),
  }),
  sender: z.object({ name: z.string().trim().min(2).max(60) }),
  delivery: z.object({ date: zDate, slot: zSlot }),
  card: z.object({
    design: z.number().int().min(0).max(20).default(0), message: z.string().trim().min(1).max(500),
    from: z.string().trim().max(60).default(''), hidePrice: z.boolean().default(true),
  }),
  surprise: z.boolean().default(true),
  occasion: zOccasion.optional(),
  promoCode: z.string().trim().max(30).optional(),
  payment: zPaymentMethod,
})

/** SSE helper: forward bus events matching `filter` until the client disconnects. */
export function sse(c: Parameters<typeof streamSSE>[0], filter: (e: LammaEvent) => boolean) {
  return streamSSE(c, async (stream) => {
    let id = 0
    const onEvent = (e: LammaEvent) => { if (filter(e)) void stream.writeSSE({ event: e.type, data: JSON.stringify(e), id: String(++id) }) }
    bus.on('event', onEvent)
    stream.onAbort(() => { bus.off('event', onEvent) })
    await stream.writeSSE({ event: 'ready', data: '{}' })
    while (!stream.aborted) {
      await stream.sleep(25_000)
      if (!stream.aborted) await stream.writeSSE({ event: 'ping', data: '{}' })
    }
    bus.off('event', onEvent)
  })
}

async function orderForToken(id: string, token: string | undefined) {
  const [o] = await db.select({ id: schema.orders.id, publicToken: schema.orders.publicToken }).from(schema.orders).where(eq(schema.orders.id, id))
  if (!o || !token || !safeEqual(o.publicToken, token)) throw E.notFound('order')
  return o
}

export const orderRoutes = new Hono<AppEnv>()
  /* ---- pricing & delivery (public) ---- */
  .post('/cart/quote', v('json', z.object({
    items: z.array(zCartItem).max(40), city: zCity.optional(), promoCode: z.string().trim().max(30).optional(), date: zDate.optional(), slot: zSlot.optional(),
  })), async (c) => {
    const { items, ...opts } = c.req.valid('json')
    return c.json(await orders.quote(items, opts))
  })
  .post('/delivery/slots', v('json', z.object({ items: z.array(zCartItem).max(40), days: z.number().int().min(1).max(30).default(14) })), async (c) => {
    const { items, days } = c.req.valid('json')
    const q = await orders.quote(items, {})
    return c.json({ maxLeadHours: q.maxLeadHours, days: orders.availableSlots(q.maxLeadHours, days) })
  })
  .post('/promo/validate', rateLimit('promo', 30, 60e3), v('json', z.object({ code: z.string().trim().min(1).max(30), items: z.array(zCartItem).max(40).default([]) })), async (c) => {
    const { code, items } = c.req.valid('json')
    const q = await orders.quote(items.length ? items : [], { promoCode: code })
    const prob = q.problems.find((p) => p.code.startsWith('promo_'))
    return c.json(prob ? { valid: false, problem: prob } : { valid: true, promo: q.promo, discount: q.discount })
  })

  /* ---- public tracking & digital surprise (shareable links carry the order's secret token) ---- */
  .get('/track/:id', async (c) => {
    const o = await orderForToken(c.req.param('id'), c.req.query('token'))
    return c.json({ order: await orders.loadOrder(o.id, 'public') })
  })
  .get('/track/:id/stream', async (c) => {
    const o = await orderForToken(c.req.param('id'), c.req.query('token'))
    return sse(c, (e) => 'orderId' in e && e.orderId === o.id)
  })
  .get('/surprise/:id', async (c) => {
    const o = await orderForToken(c.req.param('id'), c.req.query('token'))
    return c.json({ order: await orders.loadOrder(o.id, 'public') })
  })
  .post('/surprise/:id/reveal', async (c) => {
    const o = await orderForToken(c.req.param('id'), c.req.query('token'))
    await db.update(schema.orders).set({ revealedAt: new Date() }).where(eq(schema.orders.id, o.id))
    return c.json({ ok: true })
  })

  /* ---- customer orders ---- */
  .post('/orders', requireAuth(), rateLimit('orders', 20, 600e3), v('json', zCreateOrder), async (c) => {
    const b = c.req.valid('json')
    const userId = userOf(c).sub
    const { orderId, payment } = await orders.createOrder(userId, {
      lines: b.lines, recipient: b.recipient, senderName: b.sender.name,
      deliveryDate: b.delivery.date, deliverySlot: b.delivery.slot,
      card: { ...b.card, from: b.card.from || b.sender.name }, surprise: b.surprise, occasion: b.occasion,
      promoCode: b.promoCode || undefined, paymentMethod: b.payment,
    })
    await db.delete(schema.carts).where(eq(schema.carts.userId, userId))
    return c.json({ order: await orders.loadOrder(orderId, 'owner'), payment: { provider: payments.name, demo: payments.isDemo, ...payment } }, 201)
  })
  .get('/orders', requireAuth(), async (c) => {
    return c.json({ items: await orders.loadOrders(await orders.orderIdsForUser(userOf(c).sub), 'owner') })
  })
  .get('/orders/:id', requireAuth(), async (c) => {
    const id = c.req.param('id')
    if ((await ownerOf(id)) !== userOf(c).sub) throw E.notFound('order')
    return c.json({ order: await orders.loadOrder(id, 'owner') })
  })
  .post('/orders/:id/pay', requireAuth(), async (c) => {
    const r = await orders.payOrder(c.req.param('id'), userOf(c).sub)
    return c.json({ ...r, order: await orders.loadOrder(c.req.param('id'), 'owner') })
  })
  .post('/orders/:id/cancel', requireAuth(), async (c) => {
    await orders.cancelOrder(c.req.param('id'), userOf(c).sub)
    return c.json({ order: await orders.loadOrder(c.req.param('id'), 'owner') })
  })
  .get('/orders/:id/stream', requireAuth(), async (c) => {
    const id = c.req.param('id')
    if ((await ownerOf(id)) !== userOf(c).sub) throw E.notFound('order')
    return sse(c, (e) => 'orderId' in e && e.orderId === id)
  })

async function ownerOf(id: string) {
  const [o] = await db.select({ userId: schema.orders.userId }).from(schema.orders).where(eq(schema.orders.id, id))
  return o?.userId
}
