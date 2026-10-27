/*
 * Demo seed data. Every merchant here is a TEMPORARY placeholder with a Saudi-style but fictional
 * name (is_placeholder = true) — replace them as real merchants are approved:
 *   POST /api/v1/admin/merchants/bulk-status { "status": "suspended", "placeholdersOnly": true }
 * Customers and orders are demo records too (users.is_demo = true).
 */
import { eq, sql as dsql } from 'drizzle-orm'
import { db, schema, sql } from './client'
import { STATIC_CATEGORIES, STATIC_MERCHANTS, STATIC_PRODUCTS } from './static-data'
import { toHalalas } from '../lib/money'
import { refreshCatalog } from '../services/catalog'
import { createOrder, payOrder, setSubStatus } from '../services/orders'
import { PRODUCTS, MERCHANTS } from '../../../src/data/catalog'
import { STATUS_FLOW, SLOTS, type StatusId } from '../../../src/lib/model'
import { riyadhToday, addDays } from '../lib/time'

export const DEMO = {
  admin: { phone: '+966500000001', name: 'إدارة لمّة' },
  merchantPhone: (i: number) => `+9665000001${String(i + 1).padStart(2, '0')}`,
  customers: [
    { phone: '+966550000101', name: 'نورة القحطاني' },
    { phone: '+966550000102', name: 'عبدالله العتيبي' },
    { phone: '+966550000103', name: 'ريم الشهري' },
    { phone: '+966550000104', name: 'فيصل الدوسري' },
    { phone: '+966550000105', name: 'سارة الغامدي' },
    { phone: '+966550000106', name: 'محمد الزهراني' },
    { phone: '+966550000107', name: 'لمى الحربي' },
    { phone: '+966550000108', name: 'خالد المطيري' },
  ],
}

/** Merchants that start as "pending" (awaiting approval), like the web demo. */
const PENDING = new Set(['qamariya'])

const RECIPIENTS = [
  { name: 'هيفاء', city: 'riyadh', district: 'حي النرجس' }, { name: 'منيرة', city: 'riyadh', district: 'حي الملقا' },
  { name: 'تركي', city: 'riyadh', district: 'حي العليا' }, { name: 'غادة', city: 'jeddah', district: 'حي الروضة' },
  { name: 'ياسر', city: 'jeddah', district: 'حي الحمراء' }, { name: 'دانة', city: 'dammam', district: 'حي الشاطئ' },
  { name: 'سلطان', city: 'khobar', district: 'حي الراكة' }, { name: 'هند', city: 'riyadh', district: 'حي الياسمين' },
  { name: 'عبدالرحمن', city: 'dammam', district: 'حي الفيصلية' }, { name: 'جود', city: 'jeddah', district: 'حي السلامة' },
]
const MESSAGES = ['كل عام وأنتِ بخير 🤍', 'مبروك التخرج، فخورين فيك!', 'الحمد لله على السلامة', 'شكراً لأنك دايم موجود', 'عيدكم مبارك', 'مبارك البيت الجديد']
const OCCASIONS = ['birthday', 'graduation', 'newborn', 'thanks', 'eid', 'newhome'] as const

/** Small deterministic PRNG so the demo data is the same on every seed. */
function rng(seed: number) {
  return () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296 }
}

export async function seed({ withOrders = true, log = true } = {}) {
  const [existing] = await db.select({ n: dsql<number>`count(*)::int` }).from(schema.merchants)
  if (existing.n > 0) { if (log) console.log('Database already has data — skipping seed (use db:reset to start over).'); return }

  await db.insert(schema.categories).values(STATIC_CATEGORIES.map((c, i) => ({
    id: c.id, nameAr: c.name.ar, nameEn: c.name.en, blurbAr: c.blurb.ar, blurbEn: c.blurb.en, art: c.art, sort: i,
  })))
  await db.insert(schema.merchants).values(STATIC_MERCHANTS.map((m, i) => ({
    id: m.id, nameAr: m.name.ar, nameEn: m.name.en, taglineAr: m.tagline.ar, taglineEn: m.tagline.en, aboutAr: m.about.ar, aboutEn: m.about.en,
    categories: m.cats, cities: m.cities, rating: m.rating, reviews: m.reviews, since: m.since, hue: m.hue, initials: m.initials,
    prepTimeAr: m.prepTime.ar, prepTimeEn: m.prepTime.en, commission: m.commission,
    status: PENDING.has(m.id) ? ('pending' as const) : ('active' as const), isPlaceholder: true, contactPhone: DEMO.merchantPhone(i),
  })))
  for (let i = 0; i < STATIC_PRODUCTS.length; i += 50) {
    await db.insert(schema.products).values(STATIC_PRODUCTS.slice(i, i + 50).map((p) => ({
      id: p.id, merchantId: p.merchant, category: p.cat, extraCategories: p.extraCats ?? [],
      nameAr: p.name.ar, nameEn: p.name.en, descAr: p.desc.ar, descEn: p.desc.en,
      priceHalalas: toHalalas(p.price), wasHalalas: p.was ? toHalalas(p.was) : null,
      rating: p.rating, reviews: p.reviews, stock: p.stock, leadHours: p.leadHours,
      occasions: p.occasions, recipients: p.recipients, ages: p.ages ?? null, interests: p.interests ?? null,
      variants: p.variants, personalize: p.personalize ?? null, art: p.art, badge: p.badge ?? null,
      hidden: !!p.hidden, createdAt: new Date(p.created),
    })))
  }
  await db.insert(schema.users).values([
    { phone: DEMO.admin.phone, name: DEMO.admin.name, role: 'admin' as const, isDemo: true },
    ...STATIC_MERCHANTS.map((m, i) => ({ phone: DEMO.merchantPhone(i), name: `فريق ${m.name.ar}`, role: 'merchant' as const, merchantId: m.id, isDemo: true })),
    ...DEMO.customers.map((c) => ({ ...c, isDemo: true })),
  ])
  await db.insert(schema.promoCodes).values({ code: 'LAMMA10', percent: 10 })
  await refreshCatalog()
  if (withOrders) await seedOrders()
  if (log) console.log(`✓ seeded ${STATIC_MERCHANTS.length} placeholder merchants, ${STATIC_PRODUCTS.length} products, ${DEMO.customers.length} demo customers${withOrders ? ' and demo orders' : ''}`)
}

async function seedOrders() {
  const rand = rng(2024)
  const pick = <T>(xs: T[]) => xs[Math.floor(rand() * xs.length)]
  const customers = await db.select().from(schema.users).where(eq(schema.users.role, 'customer'))
  const future = addDays(riyadhToday(), 7)
  // status per order, newest first: a realistic mix for the dashboards
  const plan: (StatusId | 'rejected')[] = ['placed', 'placed', 'accepted', 'preparing', 'preparing', 'ready', 'out', 'delivered', 'delivered', 'delivered', 'delivered', 'delivered', 'rejected', 'delivered', 'delivered', 'delivered', 'delivered', 'delivered']
  for (let i = 0; i < plan.length; i++) {
    const r = RECIPIENTS[i % RECIPIENTS.length]
    const pool = PRODUCTS.filter((p) => MERCHANTS.find((m) => m.id === p.merchant)!.cities.includes(r.city as never) && p.stock > 3)
    const n = 1 + Math.floor(rand() * 3)
    const lines = new Map<string, number>()
    while (lines.size < n) lines.set(pick(pool).id, 1 + (rand() < 0.2 ? 1 : 0))
    const user = customers[i % customers.length]
    const { orderId } = await createOrder(user.id, {
      lines: [...lines].map(([productId, qty]) => ({ productId, qty, variant: {} })),
      recipient: { name: r.name, phone: `+9665${String(50000000 + i * 7919).slice(0, 8)}`, city: r.city, district: r.district, address: 'شارع تجريبي' },
      senderName: user.name ?? 'عميل', deliveryDate: future, deliverySlot: SLOTS[2].id,
      card: { design: i % 4, message: MESSAGES[i % MESSAGES.length], from: (user.name ?? '').split(' ')[0], hidePrice: true },
      surprise: i % 3 !== 2, occasion: OCCASIONS[i % OCCASIONS.length], promoCode: i % 5 === 1 ? 'LAMMA10' : undefined,
      paymentMethod: (['mada', 'apple', 'stc', 'tabby'] as const)[i % 4],
    })
    await payOrder(orderId, user.id)
    const subs = await db.select().from(schema.subOrders).where(eq(schema.subOrders.orderId, orderId))
    const target = plan[i]
    for (const s of subs) {
      if (target === 'rejected') { await setSubStatus(orderId, s.merchantId, 'rejected', user.id, { force: true, note: 'نفدت الكمية' }); continue }
      for (const st of STATUS_FLOW.slice(1, STATUS_FLOW.indexOf(target) + 1)) await setSubStatus(orderId, s.merchantId, st, user.id, { force: true })
    }
    // Spread orders over the last two weeks (newest first) and make history timestamps plausible.
    const hoursAgo = i === 0 ? 0.3 : i < 3 ? i * 1.5 : 6 + (i - 3) * 20 + Math.floor(rand() * 8)
    const createdAt = new Date(Date.now() - hoursAgo * 3600e3)
    const delivery = target === 'delivered' || target === 'rejected' ? addDays(createdAt.toISOString().slice(0, 10), 1) : addDays(riyadhToday(), 1)
    await db.update(schema.orders).set({ createdAt, paidAt: new Date(createdAt.getTime() + 60e3), deliveryDate: delivery }).where(eq(schema.orders.id, orderId))
    const events = await db.select().from(schema.orderEvents).where(eq(schema.orderEvents.orderId, orderId)).orderBy(schema.orderEvents.id)
    for (const [k, e] of events.entries())
      await db.update(schema.orderEvents).set({ at: new Date(createdAt.getTime() + k * Math.min(40, hoursAgo * 60 / (events.length + 1)) * 60e3) }).where(eq(schema.orderEvents.id, e.id))
  }
}

const isMain = process.argv[1] && /seed\.(ts|js)$/.test(process.argv[1])
if (isMain) {
  seed().then(() => sql.end()).catch(async (e) => { console.error(e); await sql.end(); process.exit(1) })
}
