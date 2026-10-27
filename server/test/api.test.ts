import { beforeAll, afterAll, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { rm } from 'node:fs/promises'
import { db, schema, sql } from '../src/db/client'
import { resetDatabase } from '../src/db/reset'
import { DEMO } from '../src/db/seed'
import { STATIC_MERCHANTS } from '../src/db/static-data'
import { refreshCatalog } from '../src/services/catalog'
import { expireUnpaidOrders } from '../src/services/orders'
import { startEventListener } from '../src/lib/events'
import { resetRateLimits } from '../src/lib/rate-limit'
import { app, get, post, put, patch, del, login, order, inDays } from './helpers'

const merchantPhone = (id: string) => DEMO.merchantPhone(STATIC_MERCHANTS.findIndex((m) => m.id === id))
let admin: Awaited<ReturnType<typeof login>>
let noura: Awaited<ReturnType<typeof login>>
let reem: Awaited<ReturnType<typeof login>>
let najd: Awaited<ReturnType<typeof login>>

beforeAll(async () => {
  await resetDatabase({ withOrders: true, log: false })
  await refreshCatalog()
  await startEventListener()
  admin = await login(DEMO.admin.phone)
  noura = await login(DEMO.customers[0].phone)
  reem = await login(merchantPhone('reem'))
  najd = await login(merchantPhone('najd'))
})
afterAll(async () => {
  await rm('./.test-uploads', { recursive: true, force: true })
  await sql.end()
})

const stockOf = async (id: string) => (await db.select({ s: schema.products.stock }).from(schema.products).where(eq(schema.products.id, id)))[0].s

describe('catalog', () => {
  it('health and meta', async () => {
    const h = await app.request('/health')
    expect(h.status).toBe(200)
    const m = await get('/meta')
    expect(m.body.categories).toHaveLength(13)
    expect(m.body.slots).toHaveLength(3)
    expect(m.body.collections.map((c: any) => c.id)).toEqual(['kids', 'her', 'him', 'baby', 'personalized'])
  })

  it('bootstrap matches the storefront and supports ETag', async () => {
    const r = await get('/catalog/bootstrap')
    expect(r.status).toBe(200)
    expect(r.body.products).toHaveLength(66) // 70 web products minus the pending merchant's 4
    expect(r.body.products.every((p: any) => p.merchant !== 'qamariya')).toBe(true)
    expect(r.body.products.find((p: any) => p.id === 'ph01').images.full).toMatch(/\/static\/products\/.+\.webp$/)
    const again = await get('/catalog/bootstrap', { headers: { 'if-none-match': r.headers.get('etag')! } })
    expect(again.status).toBe(304)
  })

  it('filters, searches, sorts and paginates', async () => {
    const kids = await get('/products?for=kids&limit=100')
    expect(kids.body.total).toBeGreaterThan(5)
    expect(kids.body.items.every((p: any) => p.cat === 'balloons' || (p.ages && !p.ages.every((a: string) => a === 'baby')))).toBe(true)
    const asc = await get('/products?cat=flowers&sort=price-asc&limit=100')
    const prices = asc.body.items.map((p: any) => p.price)
    expect(prices).toEqual([...prices].sort((a, b) => a - b))
    const search = await get('/products?q=' + encodeURIComponent('ورد'))
    expect(search.body.total).toBeGreaterThan(0)
    const page2 = await get('/products?limit=5&page=2')
    expect(page2.body.items).toHaveLength(5)
    const bad = await get('/products?cat=nope')
    expect(bad.status).toBe(400)
    expect(bad.body.error.code).toBe('validation_error')
  })

  it('product detail with related items; hidden products are 404', async () => {
    const r = await get('/products/ph23')
    expect(r.status).toBe(200)
    expect(r.body.merchant.id).toBe('numu')
    expect(r.body.related.length).toBeGreaterThan(0)
    const hidden = (await db.select().from(schema.products).where(eq(schema.products.hidden, true)).limit(1))[0]
    expect((await get(`/products/${hidden.id}`)).status).toBe(404)
  })

  it('merchants list only active stores', async () => {
    const r = await get('/merchants')
    expect(r.body.items.some((m: any) => m.id === 'qamariya')).toBe(false)
    expect(r.body.items.every((m: any) => m.isPlaceholder)).toBe(true)
  })
})

describe('auth', () => {
  it('rejects invalid phones and wrong codes', async () => {
    resetRateLimits()
    expect((await post('/auth/otp/request', { phone: '12345' })).status).toBe(400)
    await post('/auth/otp/request', { phone: '0559998877' })
    const wrong = await post('/auth/otp/verify', { phone: '0559998877', code: '0000' })
    expect(wrong.status).toBe(400)
    expect(wrong.body.error.code).toBe('otp_invalid')
    expect(wrong.body.error.messageAr).toBeTruthy()
  })

  it('rate-limits OTP requests per phone', async () => {
    resetRateLimits()
    expect((await post('/auth/otp/request', { phone: '0559998800' })).status).toBe(200)
    const again = await post('/auth/otp/request', { phone: '0559998800' })
    expect(again.status).toBe(429)
    expect(again.headers.get('retry-after')).toBeTruthy()
  })

  it('signs up a new customer, accepts Arabic digits and +966 formats', async () => {
    const u = await login('+966 55 999 1122', 'تركي')
    expect(u.isNew).toBe(true)
    expect(u.user).toMatchObject({ role: 'customer', name: 'تركي', phone: '0559991122' })
    const me = await get('/me', { token: u.accessToken })
    expect(me.body.user.phone).toBe('0559991122')
    const again = await login('٠٥٥٩٩٩١١٢٢')
    expect(again.isNew).toBe(false)
  })

  it('rotates refresh tokens and revokes all sessions on reuse', async () => {
    const u = await login('0559991133')
    const r1 = await post('/auth/refresh', { refreshToken: u.refreshToken })
    expect(r1.status).toBe(200)
    const reuse = await post('/auth/refresh', { refreshToken: u.refreshToken })
    expect(reuse.status).toBe(401)
    // the token issued by r1 is revoked too (theft protection)
    expect((await post('/auth/refresh', { refreshToken: r1.body.refreshToken })).status).toBe(401)
  })

  it('protects routes by role', async () => {
    expect((await get('/me')).status).toBe(401)
    expect((await get('/admin/stats', { token: noura.accessToken })).status).toBe(403)
    expect((await get('/merchant/orders', { token: noura.accessToken })).status).toBe(403)
    expect((await get('/admin/stats', { token: reem.accessToken })).status).toBe(403)
    expect((await get('/me', { token: 'garbage' })).status).toBe(401)
  })
})

describe('account', () => {
  it('syncs the cart with a server-side quote', async () => {
    const r = await put('/me/cart', { items: [{ productId: 'ph01', qty: 2, variant: {} }], city: 'riyadh' }, { token: noura.accessToken })
    expect(r.status).toBe(200)
    expect(r.body.quote.subtotal).toBe(690)
    const g = await get('/me/cart', { token: noura.accessToken })
    expect(g.body.items).toHaveLength(1)
  })

  it('favourites, addresses and saved occasions', async () => {
    const t = { token: noura.accessToken }
    expect((await put('/me/favorites/ph23', {}, t)).status).toBe(200)
    expect((await get('/me/favorites', t)).body.ids).toContain('ph23')
    await del('/me/favorites/ph23', t)
    expect((await get('/me/favorites', t)).body.ids).not.toContain('ph23')
    const a = await post('/me/addresses', { label: 'البيت', name: 'نورة', phone: '0551112233', city: 'riyadh', district: 'حي الملقا' }, t)
    expect(a.status).toBe(201)
    expect((await get('/me/addresses', t)).body.items[0].phone).toBe('0551112233')
    const o = await post('/me/occasions', { title: 'عيد ميلاد أمي', occasion: 'birthday', recipient: 'mother', date: inDays(10) }, t)
    expect(o.status).toBe(201)
    expect(o.body.occasion.daysUntil).toBeGreaterThanOrEqual(9)
    expect((await del(`/me/occasions/${o.body.occasion.id}`, { token: reem.accessToken })).status).toBe(404) // not theirs
  })
})

describe('pricing quote', () => {
  it('prices variants and LAMMA10 on the server', async () => {
    const r = await post('/cart/quote', { items: [{ productId: 'ph01', qty: 1, variant: { size: 'grand' } }, { productId: 'ph17', qty: 2, variant: {} }], promoCode: 'lamma10', city: 'riyadh' })
    expect(r.body.problems).toEqual([])
    expect(r.body.subtotal).toBe(345 + 90 + 245 * 2)
    expect(r.body.delivery).toBe(40) // two merchants
    expect(r.body.discount).toBe(Math.round((345 + 90 + 490) * 0.1 * 100) / 100)
    expect(r.body.total).toBe(r.body.subtotal + r.body.delivery - r.body.discount)
  })

  it('reports every problem with a code', async () => {
    const r = await post('/cart/quote', {
      items: [
        { productId: 'ph09', qty: 1, variant: {} },              // pending merchant
        { productId: 'ph01', qty: 1, variant: { size: 'xxl' } }, // bad variant
        { productId: 'ph05', qty: 20, variant: {} },             // stock 4
      ],
      city: 'dammam', promoCode: 'NOPE',
    })
    const codes = r.body.problems.map((p: any) => p.code)
    expect(codes).toEqual(expect.arrayContaining(['product_unavailable', 'invalid_variant', 'insufficient_stock', 'city_not_served', 'promo_invalid']))
  })

  it('enforces preparation time on delivery slots', async () => {
    const tooSoon = await post('/cart/quote', { items: [{ productId: 'p034', qty: 1, variant: {} }], date: inDays(0), slot: '10:00–14:00' })
    expect(tooSoon.body.problems.map((p: any) => p.code)).toContain('slot_unavailable')
    const slots = await post('/delivery/slots', { items: [{ productId: 'p034', qty: 1, variant: {} }], days: 5 })
    expect(slots.body.maxLeadHours).toBe(72)
    expect(slots.body.days[0].slots).toEqual([])
    expect(slots.body.days[4].slots).toHaveLength(3)
  })
})

describe('orders: checkout → merchant → tracking', () => {
  let orderId = ''
  let token = ''

  it('creates an order, reserves stock and waits for payment', async () => {
    const before = await stockOf('ph01')
    const r = await post('/orders', order([{ productId: 'ph01', qty: 2 }, { productId: 'ph17' }], { promoCode: 'LAMMA10' }), { token: noura.accessToken })
    expect(r.status).toBe(201)
    orderId = r.body.order.id
    token = r.body.order.publicToken
    expect(orderId).toMatch(/^LM-\d{6}$/)
    expect(r.body.order.paymentStatus).toBe('pending')
    expect(r.body.order.totals).toEqual({ subtotal: 935, delivery: 40, discount: 93.5, total: 881.5 })
    expect(r.body.payment).toMatchObject({ provider: 'demo', demo: true, kind: 'confirm' })
    expect(await stockOf('ph01')).toBe(before - 2)
    // merchants don't see unpaid orders
    const list = await get('/merchant/orders', { token: reem.accessToken })
    expect(list.body.items.some((o: any) => o.id === orderId)).toBe(false)
    // checkout clears the server cart
    expect((await get('/me/cart', { token: noura.accessToken })).body.items).toEqual([])
  })

  it('rejects tampered or invalid checkouts', async () => {
    const bad = await post('/orders', order([{ productId: 'ph01' }], { recipient: { name: 'x', phone: '123', city: 'riyadh', district: 'حي' } }), { token: noura.accessToken })
    expect(bad.status).toBe(400)
    const city = await post('/orders', order([{ productId: 'ph01' }], { recipient: { name: 'هيفاء', phone: '0551234567', city: 'abha', district: 'حي المنهل' } }), { token: noura.accessToken })
    expect(city.status).toBe(400)
    expect(city.body.error.details.map((d: any) => d.code)).toContain('city_not_served')
    expect((await post('/orders', order([{ productId: 'ph01' }]))).status).toBe(401)
  })

  it('pays (demo) and notifies merchants', async () => {
    const r = await post(`/orders/${orderId}/pay`, {}, { token: noura.accessToken })
    expect(r.status).toBe(200)
    expect(r.body.order.paymentStatus).toBe('paid')
    expect((await post(`/orders/${orderId}/pay`, {}, { token: noura.accessToken })).body.alreadyPaid).toBe(true)
    expect((await post(`/orders/${orderId}/pay`, {}, { token: reem.accessToken })).status).toBe(404) // not the owner
  })

  it('merchant sees only their part and moves it through the flow', async () => {
    const list = await get('/merchant/orders?status=open', { token: reem.accessToken })
    const mine = list.body.items.find((o: any) => o.id === orderId)
    expect(mine.lines.every((l: any) => l.merchant === 'reem')).toBe(true)
    expect(Object.keys(mine.sub)).toEqual(['reem'])
    expect(mine.totals.payout).toBe(mine.totals.total - mine.totals.commission)

    const skip = await post(`/merchant/orders/${orderId}/status`, { to: 'delivered' }, { token: reem.accessToken })
    expect(skip.status).toBe(409)
    expect(skip.body.error.code).toBe('invalid_transition')
    for (const to of ['accepted', 'preparing', 'ready', 'out', 'delivered']) {
      const r = await post(`/merchant/orders/${orderId}/status`, { to }, { token: reem.accessToken })
      expect(r.status).toBe(200)
      expect(r.body.status).toBe(to)
    }
    // the other merchant can't touch reem's part
    expect((await post(`/merchant/orders/${orderId}/status`, {}, { token: (await login(merchantPhone('samt'))).accessToken })).status).toBe(404)
  })

  it('customer tracking reflects each merchant; overall = slowest part', async () => {
    const r = await get(`/orders/${orderId}`, { token: noura.accessToken })
    expect(r.body.order.sub.reem.status).toBe('delivered')
    expect(r.body.order.sub.najd.status).toBe('placed')
    expect(r.body.order.status).toBe('placed')
    expect(r.body.order.sub.reem.history.map((h: any) => h.status)).toEqual(['placed', 'accepted', 'preparing', 'ready', 'out', 'delivered'])
    await post(`/merchant/orders/${orderId}/status`, {}, { token: najd.accessToken }) // next step = accepted
    expect((await get(`/orders/${orderId}`, { token: noura.accessToken })).body.order.status).toBe('accepted')
  })

  it('public tracking link hides contact details and prices', async () => {
    const r = await get(`/track/${orderId}?token=${token}`)
    expect(r.status).toBe(200)
    expect(r.body.order.recipient.phone).toBe('')
    expect(r.body.order.totals).toBeNull()
    expect(r.body.order.lines.every((l: any) => l.unit === 0)).toBe(true)
    expect(r.body.order.publicToken).toBeUndefined()
    expect((await get(`/track/${orderId}?token=wrong`)).status).toBe(404)
    expect((await get(`/track/${orderId}`)).status).toBe(404)
  })

  it('digital surprise can be revealed with the link', async () => {
    expect((await get(`/surprise/${orderId}?token=${token}`)).body.order.revealed).toBe(false)
    await post(`/surprise/${orderId}/reveal?token=${token}`)
    expect((await get(`/surprise/${orderId}?token=${token}`)).body.order.revealed).toBe(true)
  })

  it('streams live status changes (SSE)', async () => {
    const res = await app.request(`/api/v1/track/${orderId}/stream?token=${token}`)
    const reader = res.body!.getReader()
    const dec = new TextDecoder()
    let buf = ''
    const read = async (needle: string) => {
      const deadline = Date.now() + 5000
      while (!buf.includes(needle) && Date.now() < deadline) {
        const { value, done } = await reader.read()
        if (done) break
        buf += dec.decode(value)
      }
      return buf.includes(needle)
    }
    expect(await read('event: ready')).toBe(true)
    await post(`/merchant/orders/${orderId}/status`, { to: 'preparing' }, { token: najd.accessToken })
    expect(await read('"status":"preparing"')).toBe(true)
    await reader.cancel()
  })
})

describe('cancellation, rejection and expiry restore stock', () => {
  it('customer can cancel before a merchant accepts (refunded)', async () => {
    const before = await stockOf('ph48')
    const o = (await post('/orders', order([{ productId: 'ph48', qty: 2 }]), { token: noura.accessToken })).body.order
    await post(`/orders/${o.id}/pay`, {}, { token: noura.accessToken })
    expect(await stockOf('ph48')).toBe(before - 2)
    const c = await post(`/orders/${o.id}/cancel`, {}, { token: noura.accessToken })
    expect(c.status).toBe(200)
    expect(c.body.order).toMatchObject({ status: 'cancelled', paymentStatus: 'refunded', cancelled: true })
    expect(await stockOf('ph48')).toBe(before)
  })

  it("can't cancel once accepted", async () => {
    const o = (await post('/orders', order([{ productId: 'ph17' }]), { token: noura.accessToken })).body.order
    await post(`/orders/${o.id}/pay`, {}, { token: noura.accessToken })
    await post(`/merchant/orders/${o.id}/status`, { to: 'accepted' }, { token: najd.accessToken })
    const c = await post(`/orders/${o.id}/cancel`, {}, { token: noura.accessToken })
    expect(c.status).toBe(409)
    expect(c.body.error.code).toBe('cannot_cancel')
  })

  it('merchant rejection restores that merchant’s stock', async () => {
    const before = await stockOf('ph17')
    const o = (await post('/orders', order([{ productId: 'ph17', qty: 3 }]), { token: noura.accessToken })).body.order
    await post(`/orders/${o.id}/pay`, {}, { token: noura.accessToken })
    const r = await post(`/merchant/orders/${o.id}/status`, { to: 'rejected', note: 'نفدت الكمية' }, { token: najd.accessToken })
    expect(r.body.order.status).toBe('rejected')
    expect(await stockOf('ph17')).toBe(before)
  })

  it('unpaid orders expire and release stock', async () => {
    const before = await stockOf('ph31')
    const o = (await post('/orders', order([{ productId: 'ph31', qty: 2 }]), { token: noura.accessToken })).body.order
    expect(await stockOf('ph31')).toBe(before - 2)
    await db.update(schema.orders).set({ createdAt: new Date(Date.now() - 2 * 3600e3) }).where(eq(schema.orders.id, o.id))
    expect(await expireUnpaidOrders(30)).toBeGreaterThanOrEqual(1)
    expect(await stockOf('ph31')).toBe(before)
    expect((await get(`/orders/${o.id}`, { token: noura.accessToken })).body.order.paymentStatus).toBe('expired')
  })

  it('never oversells the last unit under concurrent checkouts', async () => {
    const created = await post('/merchant/products', {
      name: { ar: 'قطعة أخيرة', en: 'Last one' }, desc: { ar: 'وصف', en: 'desc' }, category: 'gifts', price: 100, stock: 1, leadHours: 3,
      occasions: ['birthday'], recipients: ['friend'],
    }, { token: reem.accessToken })
    const pid = created.body.product.id
    const users = await Promise.all([login('0559990001'), login('0559990002'), login('0559990003')])
    resetRateLimits()
    const results = await Promise.all(users.map((u) => post('/orders', order([{ productId: pid }]), { token: u.accessToken })))
    expect(results.filter((r) => r.status === 201)).toHaveLength(1)
    expect(results.filter((r) => r.status !== 201).every((r) => ['insufficient_stock', 'cart_invalid'].includes(r.body.error.code))).toBe(true)
    expect(await stockOf(pid)).toBe(0)
  })
})

describe('merchant catalog management', () => {
  it('creates, updates and archives products; storefront updates immediately', async () => {
    const t = { token: reem.accessToken }
    const c = await post('/merchant/products', {
      name: { ar: 'باقة تجريبية', en: 'Test bouquet' }, desc: { ar: 'ورد أبيض', en: 'White roses' }, category: 'flowers', price: 199.5,
      stock: 5, leadHours: 4, occasions: ['birthday', 'thanks'], recipients: ['mother', 'friend'],
      variants: [{ key: 'size', label: { ar: 'الحجم', en: 'Size' }, options: [{ id: 's', label: { ar: 'صغير', en: 'Small' }, delta: 0 }, { id: 'l', label: { ar: 'كبير', en: 'Large' }, delta: 50 }] }],
    }, t)
    expect(c.status).toBe(201)
    const id = c.body.product.id
    expect((await get(`/products/${id}`)).body.product.price).toBe(199.5)
    expect((await get('/products?merchant=reem&limit=100')).body.items.some((p: any) => p.id === id)).toBe(true)
    await patch(`/merchant/products/${id}`, { price: 210, stock: 0 }, t)
    const p = (await get(`/products/${id}`)).body.product
    expect(p).toMatchObject({ price: 210, stock: 0, available: false })
    expect((await patch(`/merchant/products/${id}`, { price: 1 }, { token: najd.accessToken })).status).toBe(404) // not theirs
    await del(`/merchant/products/${id}`, t)
    expect((await get('/products?merchant=reem&limit=100')).body.items.some((x: any) => x.id === id)).toBe(false)
  })

  it('validates product input', async () => {
    const r = await post('/merchant/products', { name: { ar: '', en: 'x' }, category: 'cars', price: -5 }, { token: reem.accessToken })
    expect(r.status).toBe(400)
    expect(r.body.error.details.length).toBeGreaterThan(2)
  })

  it('merchant stats and profile', async () => {
    const r = await get('/merchant/me', { token: reem.accessToken })
    expect(r.body.merchant).toMatchObject({ id: 'reem', status: 'active', isPlaceholder: true })
    expect(r.body.stats.orders).toBeGreaterThan(0)
    expect(r.body.stats.payout).toBeCloseTo(r.body.stats.gross + r.body.stats.deliveryFees - r.body.stats.commission, 2)
  })

  it('admins can act as a store with X-Merchant-Id', async () => {
    expect((await get('/merchant/orders', { token: admin.accessToken })).status).toBe(400)
    const r = await get('/merchant/orders', { token: admin.accessToken, headers: { 'x-merchant-id': 'numu' } })
    expect(r.status).toBe(200)
  })

  it('uploads product photos (images only)', async () => {
    const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])
    const form = new FormData()
    form.append('file', new File([png], 'a.png', { type: 'image/png' }))
    const r = await app.request('/api/v1/uploads', { method: 'POST', body: form, headers: { authorization: `Bearer ${reem.accessToken}` } })
    expect(r.status).toBe(201)
    const { url } = await r.json() as { url: string }
    const served = await app.request(new URL(url).pathname)
    expect(served.status).toBe(200)
    expect(served.headers.get('content-type')).toBe('image/png')
    const bad = new FormData()
    bad.append('file', new File(['<script>'], 'x.png', { type: 'image/png' }))
    expect((await app.request('/api/v1/uploads', { method: 'POST', body: bad, headers: { authorization: `Bearer ${reem.accessToken}` } })).status).toBe(400)
    const asCustomer = await app.request('/api/v1/uploads', { method: 'POST', body: form, headers: { authorization: `Bearer ${noura.accessToken}` } })
    expect(asCustomer.status).toBe(403)
    expect((await app.request('/uploads/../package.json')).status).toBe(404)
  })
})

describe('admin', () => {
  it('marketplace stats', async () => {
    const r = await get('/admin/stats', { token: admin.accessToken })
    expect(r.status).toBe(200)
    expect(r.body.gmv).toBeGreaterThan(0)
    expect(r.body.takeRate).toBeGreaterThan(0.1)
    expect(r.body.byMerchant.length).toBeGreaterThan(3)
    expect(r.body.counts.merchants_pending).toBe(1)
  })

  it('approving a pending merchant lists its products; suspending hides them', async () => {
    await patch('/admin/merchants/qamariya', { status: 'active' }, { token: admin.accessToken })
    expect((await get('/products?merchant=qamariya')).body.total).toBe(4)
    await patch('/admin/merchants/qamariya', { status: 'suspended' }, { token: admin.accessToken })
    expect((await get('/products?merchant=qamariya')).body.total).toBe(0)
    expect((await get('/products/ph09')).status).toBe(404)
  })

  it('merchant application → approval → new store login', async () => {
    const applicant = await login('0559994455', 'هند')
    const a = await post('/merchant-applications', {
      storeNameAr: 'ورد هند', storeNameEn: 'Hind Flowers', categories: ['flowers'], cities: ['riyadh'],
      contactName: 'هند', phone: '0559994455', crNumber: '1010123456', about: 'متجر ورد في الرياض',
    }, { token: applicant.accessToken })
    expect(a.status).toBe(201)
    expect((await post('/merchant-applications', { storeNameAr: 'x', storeNameEn: 'x' }, { token: applicant.accessToken })).status).toBe(400)
    const pending = await get('/admin/applications?status=pending', { token: admin.accessToken })
    expect(pending.body.items).toHaveLength(1)
    const ok = await post(`/admin/applications/${a.body.application.id}/approve`, { commission: 0.12 }, { token: admin.accessToken })
    expect(ok.status).toBe(200)
    expect(ok.body.merchant).toMatchObject({ status: 'active', isPlaceholder: false, commission: 0.12 })
    // refreshed token carries the merchant role
    const refreshed = await post('/auth/refresh', { refreshToken: applicant.refreshToken })
    expect(refreshed.body.user.role).toBe('merchant')
    const me = await get('/merchant/me', { token: refreshed.body.accessToken })
    expect(me.body.merchant.name.ar).toBe('ورد هند')
  })

  it('bulk-suspends placeholder merchants without touching real ones', async () => {
    const r = await post('/admin/merchants/bulk-status', { status: 'suspended', placeholdersOnly: true }, { token: admin.accessToken })
    expect(r.body.updated).toHaveLength(15)
    const left = await get('/merchants')
    expect(left.body.items.map((m: any) => m.name.en)).toEqual(['Hind Flowers'])
    await post('/admin/merchants/bulk-status', { status: 'active', placeholdersOnly: true }, { token: admin.accessToken })
    expect((await get('/merchants')).body.items.length).toBe(16)
  })

  it('promo codes', async () => {
    const r = await put('/admin/promos/EID25', { percent: 25, maxDiscount: 100, minSubtotal: 200 }, { token: admin.accessToken })
    expect(r.status).toBe(200)
    const small = await post('/promo/validate', { code: 'EID25', items: [{ productId: 'ph23', qty: 1, variant: {} }] })
    expect(small.body).toMatchObject({ valid: false, problem: { code: 'promo_min_subtotal' } })
    const big = await post('/promo/validate', { code: 'eid25', items: [{ productId: 'ph05', qty: 1, variant: {} }] })
    expect(big.body).toMatchObject({ valid: true, discount: 100 })
  })

  it('users and roles', async () => {
    const r = await get('/admin/users?role=customer', { token: admin.accessToken })
    expect(r.body.items.length).toBeGreaterThanOrEqual(8)
    expect((await patch(`/admin/users/${admin.user.id}`, { role: 'customer' }, { token: admin.accessToken })).status).toBe(400)
  })
})

describe('gift engine API (rule-based)', () => {
  it('parses an Arabic brief', async () => {
    const r = await post('/ai/parse', { text: 'عيد ميلاد بنتي عمرها ٧ سنوات في جدة ميزانية ٤٠٠ تحب الرسم' })
    expect(r.body.engine).toBe('rules-v1')
    expect(r.body.brief).toMatchObject({ occasion: 'birthday', city: 'jeddah', budget: 400 })
  })

  it('builds 3 age-safe bundles within budget', async () => {
    const brief = { occasion: 'birthday', recipient: 'child', budget: 500, city: 'riyadh', age: 'kids', interests: ['art'] }
    const r = await post('/ai/bundles', { brief })
    expect(r.status).toBe(200)
    expect(r.body.bundles).toHaveLength(3)
    for (const b of r.body.bundles) {
      expect(b.subtotal).toBeLessThanOrEqual(500)
      expect(b.items.every((it: any) => !it.product.ages || it.product.ages.includes('kids'))).toBe(true)
    }
    const alt = await post('/ai/alternatives', { productId: r.body.bundles[0].items[0].productId, brief })
    expect(alt.body.items.length).toBeGreaterThan(0)
    const msgs = await get('/ai/messages?occasion=graduation')
    expect(msgs.body.items.length).toBeGreaterThan(0)
  })
})

describe('demo seed', () => {
  it('has realistic demo orders with Saudi customer names', async () => {
    const r = await get('/orders', { token: noura.accessToken })
    expect(r.body.items.length).toBeGreaterThan(2)
    expect(noura.user.name).toBe('نورة القحطاني')
  })
  it('unknown routes return JSON 404', async () => {
    const r = await get('/nope')
    expect(r.status).toBe(404)
    expect(r.body.error.code).toBe('not_found')
  })
})
