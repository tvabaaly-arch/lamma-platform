import { and, eq, inArray, lt, sql as dsql, desc } from 'drizzle-orm'
import { db, schema, type Tx } from '../db/client'
import { E } from '../lib/errors'
import { toHalalas, toSar } from '../lib/money'
import { randomToken } from '../lib/crypto'
import { localPhone } from '../lib/phone'
import { riyadhTime, riyadhToday, addDays } from '../lib/time'
import { publish } from '../lib/events'
import { payments } from '../providers/payments'
import { config } from '../config'
import { SLOTS, STATUS_FLOW, DELIVERY_PER_MERCHANT, type StatusId } from '../../../src/lib/model'
import { productFromCache, merchantFromCache, isListed, isMerchantActive, imagesOf, refreshCatalog } from './catalog'
import type { CartItem, Party, CardData } from '../db/schema'

export type SubStatus = StatusId | 'rejected' | 'cancelled'
const CLOSED: SubStatus[] = ['rejected', 'cancelled']
const MAX_DAYS_AHEAD = 60

/* ---------------------------------------------------------------- quote */

export type QuoteProblem = { code: string; productId?: string; message: string; messageAr: string }
export type QuoteLine = {
  productId: string; merchantId: string; name: { ar: string; en: string }; variant: Record<string, string>
  qty: number; unit: number; lineTotal: number; note?: string; bundle?: string; leadHours: number; image: string | null
}

export type Quote = {
  lines: QuoteLine[]
  merchants: string[]
  subtotal: number; delivery: number; discount: number; total: number
  maxLeadHours: number
  promo: { code: string; percent: number } | null
  problems: QuoteProblem[]
}

const P = (code: string, en: string, ar: string, productId?: string): QuoteProblem => ({ code, message: en, messageAr: ar, ...(productId ? { productId } : {}) })

/** Earliest bookable slot for a cart with the given longest preparation time. */
export function slotAvailable(dateIso: string, slotId: string, maxLeadHours: number, now = Date.now()) {
  const slot = SLOTS.find((s) => s.id === slotId)
  if (!slot) return false
  return riyadhTime(dateIso, slot.start + 4) - now >= maxLeadHours * 3600e3
}

export function availableSlots(maxLeadHours: number, days = 14, now = Date.now()) {
  const today = riyadhToday(now)
  const out: { date: string; slots: string[] }[] = []
  for (let i = 0; i < days; i++) {
    const date = addDays(today, i)
    out.push({ date, slots: SLOTS.filter((s) => slotAvailable(date, s.id, maxLeadHours, now)).map((s) => s.id) })
  }
  return out
}

type PromoRow = typeof schema.promoCodes.$inferSelect
function promoProblem(p: PromoRow | undefined, subtotalH: number): QuoteProblem | null {
  if (!p || !p.active) return P('promo_invalid', 'Invalid promo code', 'كود الخصم غير صحيح')
  if (p.expiresAt && p.expiresAt.getTime() < Date.now()) return P('promo_expired', 'This promo code has expired', 'انتهت صلاحية كود الخصم')
  if (p.usageLimit != null && p.usedCount >= p.usageLimit) return P('promo_used_up', 'This promo code is no longer available', 'كود الخصم لم يعد متاحاً')
  if (subtotalH < p.minSubtotal) return P('promo_min_subtotal', `Minimum order for this code is SAR ${toSar(p.minSubtotal)}`, `الحد الأدنى للطلب مع هذا الكود ${toSar(p.minSubtotal)} ر.س`)
  return null
}

export async function quote(
  items: CartItem[],
  opts: { city?: string; promoCode?: string; date?: string; slot?: string },
  tx: Tx | typeof db = db,
): Promise<Quote> {
  const problems: QuoteProblem[] = []
  const lines: QuoteLine[] = []
  const qtyByProduct = new Map<string, number>()
  for (const it of items) {
    const p = productFromCache(it.productId)
    if (!p || !isListed(p)) { problems.push(P('product_unavailable', 'This product is no longer available', 'المنتج لم يعد متاحاً', it.productId)); continue }
    // variants: every group needs a valid option (default = first)
    const variant: Record<string, string> = {}
    let delta = 0
    for (const g of p.variants) {
      const chosen = it.variant?.[g.key] ?? g.options[0].id
      const opt = g.options.find((o) => o.id === chosen)
      if (!opt) { problems.push(P('invalid_variant', `Invalid option for ${g.label.en}`, `خيار غير صحيح لـ${g.label.ar}`, p.id)); continue }
      variant[g.key] = opt.id
      delta += opt.delta
    }
    const unknown = Object.keys(it.variant ?? {}).filter((k) => !p.variants.some((g) => g.key === k))
    if (unknown.length) problems.push(P('invalid_variant', `Unknown option ${unknown.join(', ')}`, 'خيار غير معروف', p.id))
    const unit = p.price + delta
    qtyByProduct.set(p.id, (qtyByProduct.get(p.id) ?? 0) + it.qty)
    if (opts.city && !merchantFromCache(p.merchant)?.cities.includes(opts.city as never))
      problems.push(P('city_not_served', `${p.name.en} doesn't deliver to this city`, `${p.name.ar} لا يوصل لهذه المدينة`, p.id))
    lines.push({
      productId: p.id, merchantId: p.merchant, name: p.name, variant, qty: it.qty, unit, lineTotal: unit * it.qty,
      ...(it.note ? { note: it.note } : {}), ...(it.bundle ? { bundle: it.bundle } : {}),
      leadHours: p.leadHours, image: imagesOf(p)?.sm ?? null,
    })
  }
  for (const [pid, qty] of qtyByProduct) {
    const p = productFromCache(pid)!
    if (qty > p.stock) problems.push(P('insufficient_stock', `Only ${p.stock} left of ${p.name.en}`, `المتبقي من ${p.name.ar} ${p.stock} فقط`, pid))
  }
  const merchants = [...new Set(lines.map((l) => l.merchantId))]
  const subtotalH = lines.reduce((a, l) => a + toHalalas(l.lineTotal), 0)
  const deliveryH = merchants.length * toHalalas(DELIVERY_PER_MERCHANT)
  let discountH = 0
  let promo: Quote['promo'] = null
  if (opts.promoCode) {
    const code = opts.promoCode.trim().toUpperCase()
    const [row] = await tx.select().from(schema.promoCodes).where(eq(schema.promoCodes.code, code))
    const prob = promoProblem(row, subtotalH)
    if (prob) problems.push(prob)
    else {
      discountH = Math.round((subtotalH * row.percent) / 100)
      if (row.maxDiscount != null) discountH = Math.min(discountH, row.maxDiscount)
      promo = { code, percent: row.percent }
    }
  }
  const maxLeadHours = Math.max(0, ...lines.map((l) => l.leadHours))
  if (opts.date) {
    const today = riyadhToday()
    if (opts.date < today || opts.date > addDays(today, MAX_DAYS_AHEAD)) problems.push(P('invalid_date', 'Choose a delivery date within the next 60 days', 'اختر موعد توصيل خلال ٦٠ يوماً'))
    else if (opts.slot && !slotAvailable(opts.date, opts.slot, maxLeadHours))
      problems.push(P('slot_unavailable', `This slot is too soon — the longest preparation time in your cart is ${maxLeadHours}h`, `الموعد قريب جداً — أطول وقت تجهيز في سلتك ${maxLeadHours} ساعة`))
  }
  if (!items.length) problems.push(P('empty_cart', 'Your cart is empty', 'السلة فارغة'))
  return {
    lines, merchants,
    subtotal: toSar(subtotalH), delivery: toSar(deliveryH), discount: toSar(discountH), total: toSar(subtotalH + deliveryH - discountH),
    maxLeadHours, promo, problems,
  }
}

/* ---------------------------------------------------------------- create */

export type CreateOrderInput = {
  lines: CartItem[]
  recipient: Party
  senderName: string
  deliveryDate: string
  deliverySlot: string
  card: CardData
  surprise: boolean
  occasion?: string
  promoCode?: string
  paymentMethod: string
}

export async function createOrder(userId: string, input: CreateOrderInput) {
  const result = await db.transaction(async (tx) => {
    const q = await quote(input.lines, { city: input.recipient.city, promoCode: input.promoCode, date: input.deliveryDate, slot: input.deliverySlot }, tx)
    if (q.problems.length) throw E.badRequest('cart_invalid', 'تعذر إتمام الطلب، راجع السلة', 'The order cannot be placed — please review the cart', q.problems)

    // Reserve stock atomically (fails if someone else bought the last item meanwhile).
    const perProduct = new Map<string, number>()
    q.lines.forEach((l) => perProduct.set(l.productId, (perProduct.get(l.productId) ?? 0) + l.qty))
    for (const [pid, qty] of perProduct) {
      const r = await tx.update(schema.products).set({ stock: dsql`${schema.products.stock} - ${qty}`, updatedAt: new Date() })
        .where(and(eq(schema.products.id, pid), dsql`${schema.products.stock} >= ${qty}`)).returning({ id: schema.products.id })
      if (!r.length) throw E.conflict('insufficient_stock', 'نفدت الكمية المطلوبة', 'Not enough stock left', [{ productId: pid }])
    }
    if (q.promo) {
      const r = await tx.update(schema.promoCodes).set({ usedCount: dsql`${schema.promoCodes.usedCount} + 1` })
        .where(and(eq(schema.promoCodes.code, q.promo.code), dsql`(${schema.promoCodes.usageLimit} is null or ${schema.promoCodes.usedCount} < ${schema.promoCodes.usageLimit})`)).returning()
      if (!r.length) throw E.conflict('promo_used_up', 'كود الخصم لم يعد متاحاً', 'This promo code is no longer available')
    }

    const [{ n }] = await tx.execute<{ n: string }>(dsql`select nextval('order_number_seq')::text as n`)
    const id = `LM-${n}`
    const now = new Date()
    await tx.insert(schema.orders).values({
      id, userId, publicToken: randomToken(18),
      recipient: input.recipient, senderName: input.senderName, city: input.recipient.city,
      deliveryDate: input.deliveryDate, deliverySlot: input.deliverySlot, card: input.card, surprise: input.surprise,
      occasion: input.occasion ?? null, promoCode: q.promo?.code ?? null,
      paymentMethod: input.paymentMethod, paymentProvider: payments.name, paymentStatus: 'pending',
      subtotal: toHalalas(q.subtotal), deliveryFee: toHalalas(q.delivery), discount: toHalalas(q.discount), total: toHalalas(q.total),
      createdAt: now,
    })
    await tx.insert(schema.orderItems).values(q.lines.map((l) => ({
      orderId: id, merchantId: l.merchantId, productId: l.productId, nameAr: l.name.ar, nameEn: l.name.en,
      category: productFromCache(l.productId)!.cat, variant: l.variant, qty: l.qty, unitPrice: toHalalas(l.unit),
      note: l.note ?? null, bundle: l.bundle ?? null,
    })))
    const fee = toHalalas(DELIVERY_PER_MERCHANT)
    await tx.insert(schema.subOrders).values(q.merchants.map((m) => {
      const sub = q.lines.filter((l) => l.merchantId === m).reduce((a, l) => a + toHalalas(l.lineTotal), 0)
      const rate = merchantFromCache(m)!.commission
      return { orderId: id, merchantId: m, status: 'placed' as const, subtotal: sub, deliveryFee: fee, commissionRate: rate, commission: Math.round(sub * rate), updatedAt: now }
    }))
    await tx.insert(schema.orderEvents).values({ orderId: id, status: 'created', actorUserId: userId, at: now })
    return { id, total: q.total }
  })
  await refreshCatalog()
  await publish({ type: 'catalog.changed', at: new Date().toISOString() })
  const payment = await payments.start({ id: result.id, total: result.total, method: input.paymentMethod })
  return { orderId: result.id, payment }
}

/* ---------------------------------------------------------------- payment */

export async function payOrder(orderId: string, userId: string) {
  const [o] = await db.select().from(schema.orders).where(eq(schema.orders.id, orderId))
  if (!o || o.userId !== userId) throw E.notFound('order')
  if (o.paymentStatus === 'paid') return { alreadyPaid: true }
  if (o.paymentStatus !== 'pending') throw E.conflict('payment_closed', 'لا يمكن دفع هذا الطلب', `This order can't be paid (${o.paymentStatus})`)
  const r = await payments.confirm({ id: o.id, total: toSar(o.total) })
  if (!r.ok) {
    await db.update(schema.orders).set({ paymentStatus: 'failed' }).where(eq(schema.orders.id, o.id))
    throw E.badRequest('payment_failed', 'فشل الدفع', `Payment failed: ${r.reason}`)
  }
  const now = new Date()
  const updated = await db.update(schema.orders).set({ paymentStatus: 'paid', paymentRef: r.ref, paidAt: now })
    .where(and(eq(schema.orders.id, o.id), eq(schema.orders.paymentStatus, 'pending'))).returning({ id: schema.orders.id })
  if (!updated.length) return { alreadyPaid: true }
  const subs = await db.select().from(schema.subOrders).where(eq(schema.subOrders.orderId, o.id))
  await db.insert(schema.orderEvents).values([
    { orderId: o.id, status: 'paid', actorUserId: userId, at: now },
    ...subs.map((s) => ({ orderId: o.id, merchantId: s.merchantId, status: 'placed', at: now })),
  ])
  await publish({ type: 'order.paid', orderId: o.id, merchantIds: subs.map((s) => s.merchantId), at: now.toISOString() })
  return { alreadyPaid: false }
}

/* ---------------------------------------------------------------- status changes */

const NEXT: Record<StatusId, SubStatus[]> = {
  placed: ['accepted', 'rejected'],
  accepted: ['preparing'],
  preparing: ['ready'],
  ready: ['out'],
  out: ['delivered'],
  delivered: [],
}

async function restoreStock(tx: Tx, orderId: string, merchantId?: string) {
  const items = await tx.select().from(schema.orderItems)
    .where(merchantId ? and(eq(schema.orderItems.orderId, orderId), eq(schema.orderItems.merchantId, merchantId)) : eq(schema.orderItems.orderId, orderId))
  for (const it of items)
    await tx.update(schema.products).set({ stock: dsql`${schema.products.stock} + ${it.qty}` }).where(eq(schema.products.id, it.productId))
}

/**
 * Move a merchant's part of an order forward. `to` omitted = next step in the flow.
 * `force` (admin) allows any status.
 */
export async function setSubStatus(orderId: string, merchantId: string, to: SubStatus | undefined, actorUserId: string, opts: { force?: boolean; note?: string } = {}) {
  const res = await db.transaction(async (tx) => {
    const [o] = await tx.select().from(schema.orders).where(eq(schema.orders.id, orderId)).for('update')
    if (!o) throw E.notFound('order')
    const [s] = await tx.select().from(schema.subOrders).where(and(eq(schema.subOrders.orderId, orderId), eq(schema.subOrders.merchantId, merchantId)))
    if (!s) throw E.notFound('order')
    if (o.paymentStatus !== 'paid' && !opts.force) throw E.conflict('not_paid', 'الطلب لم يُدفع بعد', 'This order has not been paid yet')
    if (CLOSED.includes(s.status)) throw E.conflict('order_closed', 'هذا الطلب مغلق', `This order is ${s.status}`)
    const cur = s.status as StatusId
    const target: SubStatus | undefined = to ?? NEXT[cur].find((x) => x !== 'rejected')
    if (!target) throw E.conflict('already_delivered', 'تم التوصيل مسبقاً', 'Already delivered')
    if (target === cur) return { status: cur, changed: false }
    if (!opts.force && !NEXT[cur].includes(target))
      throw E.conflict('invalid_transition', 'لا يمكن الانتقال لهذه الحالة', `Can't move from ${cur} to ${target}`, { from: cur, allowed: NEXT[cur] })
    const now = new Date()
    await tx.update(schema.subOrders).set({ status: target, updatedAt: now }).where(eq(schema.subOrders.id, s.id))
    await tx.insert(schema.orderEvents).values({ orderId, merchantId, status: target, actorUserId, note: opts.note ?? null, at: now })
    if (target === 'rejected' || target === 'cancelled') {
      await restoreStock(tx, orderId, merchantId)
      const refund = s.subtotal + s.deliveryFee
      await tx.insert(schema.orderEvents).values({ orderId, merchantId, status: 'refund_due', note: `SAR ${toSar(refund)}`, at: now })
    }
    return { status: target, changed: true, at: now }
  })
  if (res.changed) {
    if (res.status === 'rejected' || res.status === 'cancelled') await refreshCatalog()
    await publish({ type: 'order.status', orderId, merchantId, status: res.status, at: (res.at ?? new Date()).toISOString() })
  }
  return res
}

/** Customer cancellation — allowed until a merchant accepts. */
export async function cancelOrder(orderId: string, userId: string, opts: { admin?: boolean } = {}) {
  const res = await db.transaction(async (tx) => {
    const [o] = await tx.select().from(schema.orders).where(eq(schema.orders.id, orderId)).for('update')
    if (!o || (!opts.admin && o.userId !== userId)) throw E.notFound('order')
    if (o.cancelledAt) throw E.conflict('already_cancelled', 'الطلب ملغي مسبقاً', 'Order already cancelled')
    const subs = await tx.select().from(schema.subOrders).where(eq(schema.subOrders.orderId, orderId))
    if (!opts.admin && subs.some((s) => s.status !== 'placed' && !CLOSED.includes(s.status)))
      throw E.conflict('cannot_cancel', 'بدأ المتجر تجهيز الطلب، تواصل مع الدعم للإلغاء', 'A merchant has already started this order — contact support to cancel')
    const now = new Date()
    const open = subs.filter((s) => !CLOSED.includes(s.status))
    for (const s of open) {
      await tx.update(schema.subOrders).set({ status: 'cancelled', updatedAt: now }).where(eq(schema.subOrders.id, s.id))
      await restoreStock(tx, orderId, s.merchantId)
    }
    if (o.promoCode && o.paymentStatus === 'pending')
      await tx.update(schema.promoCodes).set({ usedCount: dsql`greatest(${schema.promoCodes.usedCount} - 1, 0)` }).where(eq(schema.promoCodes.code, o.promoCode))
    let paymentStatus = o.paymentStatus
    if (o.paymentStatus === 'paid') {
      const r = await payments.refund({ id: o.id, paymentRef: o.paymentRef }, toSar(o.total))
      if (r.ok) paymentStatus = 'refunded'
    } else if (o.paymentStatus === 'pending') paymentStatus = 'expired'
    await tx.update(schema.orders).set({ cancelledAt: now, paymentStatus }).where(eq(schema.orders.id, orderId))
    await tx.insert(schema.orderEvents).values({ orderId, status: 'cancelled', actorUserId: userId, at: now })
    return { merchantIds: open.map((s) => s.merchantId), at: now }
  })
  await refreshCatalog()
  await publish({ type: 'order.cancelled', orderId, merchantIds: res.merchantIds, at: res.at.toISOString() })
}

/** Release stock held by orders that were never paid. */
export async function expireUnpaidOrders(olderThanMin = config.UNPAID_ORDER_TTL_MIN) {
  const cutoff = new Date(Date.now() - olderThanMin * 60e3)
  const stale = await db.select({ id: schema.orders.id, userId: schema.orders.userId }).from(schema.orders)
    .where(and(eq(schema.orders.paymentStatus, 'pending'), lt(schema.orders.createdAt, cutoff), dsql`${schema.orders.cancelledAt} is null`))
  for (const o of stale) await cancelOrder(o.id, o.userId).catch(() => {})
  return stale.length
}

/* ---------------------------------------------------------------- read */

export function overallStatus(subs: { status: string }[]): SubStatus {
  const open = subs.filter((s) => !CLOSED.includes(s.status as SubStatus))
  if (!open.length) return subs.some((s) => s.status === 'rejected') && !subs.some((s) => s.status === 'cancelled') ? 'rejected' : 'cancelled'
  return STATUS_FLOW[Math.min(...open.map((s) => STATUS_FLOW.indexOf(s.status as StatusId)))]
}

type View = 'owner' | 'merchant' | 'admin' | 'public'

/** Load orders with items, sub-orders and history in 4 queries. */
export async function loadOrders(ids: string[], view: View, merchantId?: string) {
  if (!ids.length) return []
  const [os, items, subs, events] = await Promise.all([
    db.select().from(schema.orders).where(inArray(schema.orders.id, ids)),
    db.select().from(schema.orderItems).where(inArray(schema.orderItems.orderId, ids)),
    db.select().from(schema.subOrders).where(inArray(schema.subOrders.orderId, ids)),
    db.select().from(schema.orderEvents).where(inArray(schema.orderEvents.orderId, ids)).orderBy(schema.orderEvents.at, schema.orderEvents.id),
  ])
  const byId = new Map(os.map((o) => [o.id, o]))
  return ids.map((id) => byId.get(id)).filter(Boolean).map((o) => serializeOrder(o!, items.filter((i) => i.orderId === o!.id), subs.filter((s) => s.orderId === o!.id), events.filter((e) => e.orderId === o!.id), view, merchantId))
}

export async function loadOrder(id: string, view: View, merchantId?: string) {
  return (await loadOrders([id], view, merchantId))[0] ?? null
}

type OrderRow = typeof schema.orders.$inferSelect
type ItemRow = typeof schema.orderItems.$inferSelect
type SubRow = typeof schema.subOrders.$inferSelect
type EventRow = typeof schema.orderEvents.$inferSelect

/**
 * Same shape as the web app's `Order` type, plus API extras (status, paymentStatus, publicToken…).
 * Merchants only see their own lines; public views hide contact details and prices when requested.
 */
export function serializeOrder(o: OrderRow, items: ItemRow[], subs: SubRow[], events: EventRow[], view: View, merchantId?: string) {
  const mine = (m: string) => view !== 'merchant' || m === merchantId
  const hidePrices = view === 'public' && o.card.hidePrice
  const sub: Record<string, { status: SubStatus; history: { status: string; at: number }[]; subtotal?: number; deliveryFee?: number; commission?: number }> = {}
  for (const s of subs.filter((x) => mine(x.merchantId))) {
    const placedAt = o.paidAt ?? o.createdAt
    const history = [{ status: 'placed', at: placedAt.getTime() }, ...events
      .filter((e) => e.merchantId === s.merchantId && e.status !== 'placed' && e.status !== 'refund_due')
      .map((e) => ({ status: e.status, at: e.at.getTime() }))]
    sub[s.merchantId] = {
      status: s.status, history,
      ...(view === 'merchant' || view === 'admin' ? { subtotal: toSar(s.subtotal), deliveryFee: toSar(s.deliveryFee), commission: toSar(s.commission) } : {}),
    }
  }
  const lines = items.filter((i) => mine(i.merchantId)).map((i) => {
    const p = productFromCache(i.productId)
    return {
      key: String(i.id), productId: i.productId, variant: i.variant, qty: i.qty,
      ...(i.note ? { note: i.note } : {}), ...(i.bundle ? { bundle: i.bundle } : {}),
      unit: hidePrices ? 0 : toSar(i.unitPrice), merchant: i.merchantId,
      name: { ar: i.nameAr, en: i.nameEn }, image: p ? imagesOf(p)?.sm ?? null : null,
    }
  })
  const showContact = view !== 'public'
  const base = {
    id: o.id,
    createdAt: o.createdAt.getTime(),
    status: overallStatus(subs.filter((x) => mine(x.merchantId))),
    paymentStatus: o.paymentStatus,
    lines,
    recipient: showContact
      ? { ...o.recipient, phone: o.recipient.phone.startsWith('+966') ? localPhone(o.recipient.phone) : o.recipient.phone }
      : { name: o.recipient.name, phone: '', city: o.recipient.city, district: o.recipient.district, address: '' },
    sender: { name: o.senderName },
    delivery: { date: o.deliveryDate, slot: o.deliverySlot },
    card: o.card,
    surprise: o.surprise,
    payment: o.paymentMethod,
    totals: hidePrices ? null : view === 'merchant'
      ? (() => { const s = subs.find((x) => x.merchantId === merchantId)!; return { subtotal: toSar(s.subtotal), delivery: toSar(s.deliveryFee), discount: 0, total: toSar(s.subtotal + s.deliveryFee), commission: toSar(s.commission), payout: toSar(s.subtotal + s.deliveryFee - s.commission) } })()
      : { subtotal: toSar(o.subtotal), delivery: toSar(o.deliveryFee), discount: toSar(o.discount), total: toSar(o.total) },
    sub,
    ...(o.occasion ? { occasion: o.occasion } : {}),
    revealed: !!o.revealedAt,
    cancelled: !!o.cancelledAt,
  }
  if (view === 'owner' || view === 'admin') return { ...base, publicToken: o.publicToken, promoCode: o.promoCode, paidAt: o.paidAt?.getTime() ?? null, ...(view === 'admin' ? { userId: o.userId } : {}) }
  return base
}

export async function orderIdsForUser(userId: string, limit = 50) {
  const rows = await db.select({ id: schema.orders.id }).from(schema.orders).where(eq(schema.orders.userId, userId)).orderBy(desc(schema.orders.createdAt)).limit(limit)
  return rows.map((r) => r.id)
}

export { isMerchantActive }
