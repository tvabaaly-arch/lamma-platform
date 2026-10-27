import { Hono } from 'hono'
import { z } from 'zod'
import { and, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm'
import { db, schema } from '../db/client'
import { type AppEnv, v, requireAuth, userOf } from '../lib/http'
import { E } from '../lib/errors'
import { toHalalas, toSar } from '../lib/money'
import { localPhone } from '../lib/phone'
import { randomToken } from '../lib/crypto'
import { publish } from '../lib/events'
import { refreshCatalog, rowToMerchant } from '../services/catalog'
import { publicUser } from '../services/auth'
import * as orders from '../services/orders'
import { adminStats } from '../services/stats'

async function catalogChanged() {
  await refreshCatalog()
  await publish({ type: 'catalog.changed', at: new Date().toISOString() })
}

const merchantAdminView = async (ids?: string[]) => {
  const rows = await db.select().from(schema.merchants).where(ids ? inArray(schema.merchants.id, ids) : undefined).orderBy(schema.merchants.createdAt)
  const counts = await db.select({ m: schema.products.merchantId, n: sql<number>`count(*)::int` }).from(schema.products)
    .where(and(eq(schema.products.active, true), eq(schema.products.hidden, false))).groupBy(schema.products.merchantId)
  return rows.map((m) => ({
    ...rowToMerchant(m), status: m.status, isPlaceholder: m.isPlaceholder, contactPhone: m.contactPhone, contactEmail: m.contactEmail,
    crNumber: m.crNumber, createdAt: m.createdAt.getTime(), productCount: counts.find((x) => x.m === m.id)?.n ?? 0,
  }))
}

const slug = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24) || 'store'

export const adminRoutes = new Hono<AppEnv>()
  .use(requireAuth('admin'))

  .get('/stats', v('query', z.object({ days: z.coerce.number().int().min(1).max(365).default(30) })), async (c) => {
    return c.json(await adminStats(c.req.valid('query').days))
  })

  /* ---- merchants ---- */
  .get('/merchants', v('query', z.object({ status: z.enum(['active', 'pending', 'suspended']).optional(), placeholder: z.enum(['true', 'false']).optional() })), async (c) => {
    const { status, placeholder } = c.req.valid('query')
    let items = await merchantAdminView()
    if (status) items = items.filter((m) => m.status === status)
    if (placeholder) items = items.filter((m) => m.isPlaceholder === (placeholder === 'true'))
    return c.json({ items })
  })
  .patch('/merchants/:id', v('json', z.object({
    status: z.enum(['active', 'pending', 'suspended']).optional(),
    commission: z.number().min(0).max(0.5).optional(),
    isPlaceholder: z.boolean().optional(),
  })), async (c) => {
    const r = await db.update(schema.merchants).set({ ...c.req.valid('json'), updatedAt: new Date() }).where(eq(schema.merchants.id, c.req.param('id'))).returning({ id: schema.merchants.id })
    if (!r.length) throw E.notFound('merchant')
    await catalogChanged()
    return c.json({ merchant: (await merchantAdminView([r[0].id]))[0] })
  })
  /** E.g. hide every temporary demo merchant once real merchants are live: { status: "suspended", placeholdersOnly: true }. */
  .post('/merchants/bulk-status', v('json', z.object({
    status: z.enum(['active', 'pending', 'suspended']),
    ids: z.array(z.string()).max(500).optional(),
    placeholdersOnly: z.boolean().optional(),
  }).refine((b) => b.ids?.length || b.placeholdersOnly, 'Pass ids or placeholdersOnly')), async (c) => {
    const { status, ids, placeholdersOnly } = c.req.valid('json')
    const where = [ids?.length ? inArray(schema.merchants.id, ids) : undefined, placeholdersOnly ? eq(schema.merchants.isPlaceholder, true) : undefined].filter(Boolean)
    const r = await db.update(schema.merchants).set({ status, updatedAt: new Date() }).where(and(...where)).returning({ id: schema.merchants.id })
    await catalogChanged()
    return c.json({ updated: r.map((x) => x.id) })
  })

  /* ---- merchant applications ---- */
  .get('/applications', v('query', z.object({ status: z.enum(['pending', 'approved', 'rejected']).optional() })), async (c) => {
    const { status } = c.req.valid('query')
    const rows = await db.select().from(schema.merchantApplications).where(status ? eq(schema.merchantApplications.status, status) : undefined).orderBy(desc(schema.merchantApplications.createdAt))
    return c.json({ items: rows.map((a) => ({ ...a, phone: localPhone(a.phone) })) })
  })
  .post('/applications/:id/approve', v('json', z.object({ commission: z.number().min(0).max(0.5).default(0.15), merchantId: z.string().regex(/^[a-z0-9-]{2,32}$/).optional() })), async (c) => {
    const { commission, merchantId } = c.req.valid('json')
    const id = c.req.param('id')
    if (!z.string().uuid().safeParse(id).success) throw E.notFound('application')
    const result = await db.transaction(async (tx) => {
      const [a] = await tx.select().from(schema.merchantApplications).where(eq(schema.merchantApplications.id, id)).for('update')
      if (!a) throw E.notFound('application')
      if (a.status !== 'pending') throw E.conflict('already_reviewed', 'تمت مراجعة الطلب مسبقاً', 'This application was already reviewed')
      const mid = merchantId ?? `${slug(a.storeNameEn)}-${randomToken(3).toLowerCase().replace(/[^a-z0-9]/g, 'x')}`
      const [exists] = await tx.select({ id: schema.merchants.id }).from(schema.merchants).where(eq(schema.merchants.id, mid))
      if (exists) throw E.conflict('merchant_id_taken', 'معرّف المتجر مستخدم', 'That merchant id is taken')
      await tx.insert(schema.merchants).values({
        id: mid, nameAr: a.storeNameAr, nameEn: a.storeNameEn, aboutAr: a.about, aboutEn: a.about,
        categories: a.categories, cities: a.cities, since: new Date().getFullYear(), initials: a.storeNameAr.trim().charAt(0),
        hue: Math.floor(Math.random() * 5), commission, status: 'active', isPlaceholder: false,
        contactPhone: a.phone, contactEmail: a.email, crNumber: a.crNumber, prepTimeAr: '٢٤ ساعة', prepTimeEn: '24 hours',
      })
      await tx.update(schema.merchantApplications).set({ status: 'approved', merchantId: mid, reviewedAt: new Date() }).where(eq(schema.merchantApplications.id, a.id))
      await tx.update(schema.users).set({ role: 'merchant', merchantId: mid }).where(and(eq(schema.users.id, a.userId), sql`${schema.users.role} <> 'admin'`))
      return mid
    })
    await catalogChanged()
    return c.json({ merchant: (await merchantAdminView([result]))[0] })
  })
  .post('/applications/:id/reject', v('json', z.object({ note: z.string().trim().min(2).max(500) })), async (c) => {
    const id = c.req.param('id')
    if (!z.string().uuid().safeParse(id).success) throw E.notFound('application')
    const r = await db.update(schema.merchantApplications).set({ status: 'rejected', reviewNote: c.req.valid('json').note, reviewedAt: new Date() })
      .where(and(eq(schema.merchantApplications.id, id), eq(schema.merchantApplications.status, 'pending'))).returning({ id: schema.merchantApplications.id })
    if (!r.length) throw E.notFound('application')
    return c.json({ ok: true })
  })

  /* ---- orders ---- */
  .get('/orders', v('query', z.object({
    payment: z.enum(['pending', 'paid', 'failed', 'refunded', 'expired']).optional(), merchant: z.string().optional(),
    q: z.string().trim().max(40).optional(), limit: z.coerce.number().int().min(1).max(200).default(50),
  })), async (c) => {
    const { payment, merchant, q, limit } = c.req.valid('query')
    const where = [
      payment ? eq(schema.orders.paymentStatus, payment) : undefined,
      merchant ? sql`exists (select 1 from sub_orders s where s.order_id = ${schema.orders.id} and s.merchant_id = ${merchant})` : undefined,
      q ? or(ilike(schema.orders.id, `%${q}%`), ilike(schema.orders.senderName, `%${q}%`)) : undefined,
    ].filter(Boolean)
    const ids = await db.select({ id: schema.orders.id }).from(schema.orders).where(where.length ? and(...where) : undefined).orderBy(desc(schema.orders.createdAt)).limit(limit)
    return c.json({ items: await orders.loadOrders(ids.map((r) => r.id), 'admin') })
  })
  .post('/orders/:id/status', v('json', z.object({ merchantId: z.string(), to: z.enum(['placed', 'accepted', 'preparing', 'ready', 'out', 'delivered', 'rejected', 'cancelled']), note: z.string().max(300).optional() })), async (c) => {
    const { merchantId, to, note } = c.req.valid('json')
    const r = await orders.setSubStatus(c.req.param('id'), merchantId, to, userOf(c).sub, { force: true, note })
    return c.json({ ...r, order: await orders.loadOrder(c.req.param('id'), 'admin') })
  })
  .post('/orders/:id/cancel', async (c) => {
    await orders.cancelOrder(c.req.param('id'), userOf(c).sub, { admin: true })
    return c.json({ order: await orders.loadOrder(c.req.param('id'), 'admin') })
  })

  /* ---- users ---- */
  .get('/users', v('query', z.object({ role: z.enum(['customer', 'merchant', 'admin']).optional(), q: z.string().trim().max(40).optional(), limit: z.coerce.number().int().min(1).max(200).default(50) })), async (c) => {
    const { role, q, limit } = c.req.valid('query')
    const where = [role ? eq(schema.users.role, role) : undefined, q ? or(ilike(schema.users.name, `%${q}%`), ilike(schema.users.phone, `%${q.replace(/^0/, '')}%`)) : undefined].filter(Boolean)
    const rows = await db.select().from(schema.users).where(where.length ? and(...where) : undefined).orderBy(desc(schema.users.createdAt)).limit(limit)
    return c.json({ items: rows.map((u) => ({ ...publicUser(u), isDemo: u.isDemo, createdAt: u.createdAt.getTime(), lastLoginAt: u.lastLoginAt?.getTime() ?? null })) })
  })
  .patch('/users/:id', v('json', z.object({ role: z.enum(['customer', 'merchant', 'admin']), merchantId: z.string().nullable().optional() })), async (c) => {
    const { role, merchantId } = c.req.valid('json')
    const id = c.req.param('id')
    if (!z.string().uuid().safeParse(id).success) throw E.notFound('user')
    if (id === userOf(c).sub && role !== 'admin') throw E.badRequest('self_demote', 'لا يمكنك إزالة صلاحيتك', "You can't remove your own admin role")
    if (role === 'merchant' && !merchantId) throw E.badRequest('merchant_required', 'حدد المتجر', 'merchantId is required for merchant users')
    if (merchantId) {
      const [m] = await db.select({ id: schema.merchants.id }).from(schema.merchants).where(eq(schema.merchants.id, merchantId))
      if (!m) throw E.notFound('merchant')
    }
    const [u] = await db.update(schema.users).set({ role, merchantId: role === 'merchant' ? merchantId! : null }).where(eq(schema.users.id, id)).returning()
    if (!u) throw E.notFound('user')
    return c.json({ user: publicUser(u) })
  })

  /* ---- promo codes ---- */
  .get('/promos', async (c) => {
    const rows = await db.select().from(schema.promoCodes).orderBy(desc(schema.promoCodes.createdAt))
    return c.json({ items: rows.map((p) => ({ ...p, maxDiscount: p.maxDiscount == null ? null : toSar(p.maxDiscount), minSubtotal: toSar(p.minSubtotal) })) })
  })
  .put('/promos/:code', v('json', z.object({
    percent: z.number().int().min(1).max(90), maxDiscount: z.number().positive().nullable().default(null), minSubtotal: z.number().min(0).default(0),
    usageLimit: z.number().int().positive().nullable().default(null), active: z.boolean().default(true), expiresAt: z.string().datetime().nullable().default(null),
  })), async (c) => {
    const code = c.req.param('code').trim().toUpperCase()
    if (!/^[A-Z0-9_-]{3,30}$/.test(code)) throw E.badRequest('invalid_code', 'كود غير صالح', 'Codes use A–Z, 0–9, _ or - (3–30 chars)')
    const b = c.req.valid('json')
    const vals = {
      percent: b.percent, maxDiscount: b.maxDiscount == null ? null : toHalalas(b.maxDiscount), minSubtotal: toHalalas(b.minSubtotal),
      usageLimit: b.usageLimit, active: b.active, expiresAt: b.expiresAt ? new Date(b.expiresAt) : null,
    }
    const [p] = await db.insert(schema.promoCodes).values({ code, ...vals }).onConflictDoUpdate({ target: schema.promoCodes.code, set: vals }).returning()
    return c.json({ promo: { ...p, maxDiscount: p.maxDiscount == null ? null : toSar(p.maxDiscount), minSubtotal: toSar(p.minSubtotal) } })
  })
