import { createApp } from '../src/app'
import { resetRateLimits } from '../src/lib/rate-limit'

export const app = createApp()

type Opts = { token?: string; body?: unknown; headers?: Record<string, string> }
export async function call(method: string, path: string, o: Opts = {}) {
  const headers: Record<string, string> = { ...(o.headers ?? {}) }
  if (o.token) headers.authorization = `Bearer ${o.token}`
  if (o.body !== undefined) headers['content-type'] = 'application/json'
  const res = await app.request(`/api/v1${path}`, { method, headers, body: o.body !== undefined ? JSON.stringify(o.body) : undefined })
  const text = await res.text()
  let json: any = null
  try { json = text ? JSON.parse(text) : null } catch { json = text }
  return { status: res.status, body: json, headers: res.headers }
}
export const get = (p: string, o?: Opts) => call('GET', p, o)
export const post = (p: string, body?: unknown, o: Opts = {}) => call('POST', p, { ...o, body: body ?? {} })
export const put = (p: string, body?: unknown, o: Opts = {}) => call('PUT', p, { ...o, body: body ?? {} })
export const patch = (p: string, body?: unknown, o: Opts = {}) => call('PATCH', p, { ...o, body: body ?? {} })
export const del = (p: string, o?: Opts) => call('DELETE', p, o)

/** OTP login (dev code 1234). Returns tokens + user. */
export async function login(phone: string, name?: string) {
  resetRateLimits()
  const r1 = await post('/auth/otp/request', { phone })
  if (r1.status !== 200) throw new Error(`otp request ${r1.status} ${JSON.stringify(r1.body)}`)
  const r2 = await post('/auth/otp/verify', { phone, code: '1234', ...(name ? { name } : {}) })
  if (r2.status !== 200) throw new Error(`otp verify ${r2.status} ${JSON.stringify(r2.body)}`)
  return r2.body as { accessToken: string; refreshToken: string; user: { id: string; role: string; merchantId: string | null; name: string | null }; isNew: boolean }
}

export function inDays(n: number) {
  return new Date(Date.now() + 3 * 3600e3 + n * 86400e3).toISOString().slice(0, 10)
}

export const order = (lines: { productId: string; qty?: number; variant?: Record<string, string> }[], extra: Record<string, unknown> = {}) => ({
  lines: lines.map((l) => ({ productId: l.productId, qty: l.qty ?? 1, variant: l.variant ?? {} })),
  recipient: { name: 'هيفاء', phone: '0551234567', city: 'riyadh', district: 'حي النرجس', address: 'شارع ١' },
  sender: { name: 'نورة' },
  delivery: { date: inDays(5), slot: '18:00–22:00' },
  card: { design: 1, message: 'كل عام وأنتِ بخير', from: 'نورة', hidePrice: true },
  surprise: true,
  occasion: 'birthday',
  payment: 'mada',
  ...extra,
})
