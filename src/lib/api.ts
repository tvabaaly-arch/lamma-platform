/*
 * LAMMA API client. Active only when the site is built with VITE_API_URL
 * (e.g. VITE_API_URL=http://localhost:8787 npm run dev). Without it the site runs as the
 * self-contained demo (GitHub Pages build).
 */
import type { CartLine, Order, Brief } from './model'

const RAW = (import.meta.env.VITE_API_URL as string | undefined) ?? ''
export const API_URL = RAW.replace(/\/+$/, '')
export const apiMode = API_URL !== ''

export type Role = 'customer' | 'merchant' | 'admin'
export type ApiUser = { id: string; phone: string; name: string | null; email: string | null; role: Role; merchantId: string | null; lang: string }
type Session = { accessToken: string; refreshToken: string; user: ApiUser }

const KEY = 'lamma-api-session'
let session: Session | null = (() => { try { return JSON.parse(localStorage.getItem(KEY) ?? 'null') } catch { return null } })()
const listeners = new Set<(s: Session | null) => void>()

function save(s: Session | null) {
  session = s
  try { if (s) localStorage.setItem(KEY, JSON.stringify(s)); else localStorage.removeItem(KEY) } catch { /* storage blocked */ }
  listeners.forEach((f) => f(s))
}
export const getSession = () => session
export const onSession = (f: (s: Session | null) => void) => { listeners.add(f); return () => { listeners.delete(f) } }

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public messageAr: string, public details?: unknown) { super(message) }
  /** Message in the user's language. */
  text(lang: 'ar' | 'en') { return lang === 'ar' ? this.messageAr || this.message : this.message }
}

let refreshing: Promise<boolean> | null = null
async function tryRefresh() {
  if (!session) return false
  refreshing ??= (async () => {
    try {
      const r = await fetch(`${API_URL}/api/v1/auth/refresh`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ refreshToken: session!.refreshToken }) })
      if (!r.ok) { save(null); return false }
      save(await r.json())
      return true
    } catch { return false } finally { setTimeout(() => { refreshing = null }, 0) }
  })()
  return refreshing
}

type Opts = { body?: unknown; merchantId?: string; auth?: boolean; etag?: string }
export async function request<T>(method: string, path: string, o: Opts = {}): Promise<T> {
  const go = () => {
    const headers: Record<string, string> = {}
    if (o.body !== undefined) headers['content-type'] = 'application/json'
    if (session && o.auth !== false) headers.authorization = `Bearer ${session.accessToken}`
    if (o.merchantId) headers['x-merchant-id'] = o.merchantId
    if (o.etag) headers['if-none-match'] = o.etag
    return fetch(`${API_URL}/api/v1${path}`, { method, headers, body: o.body !== undefined ? JSON.stringify(o.body) : undefined })
  }
  let res: Response
  try { res = await go() } catch { throw new ApiError(0, 'network', 'Cannot reach the LAMMA server', 'تعذر الاتصال بخادم لمّة') }
  if (res.status === 401 && session && (await tryRefresh())) res = await go()
  if (res.status === 304) return null as T
  const data = res.status === 204 ? null : await res.json().catch(() => null)
  if (!res.ok) {
    const e = data?.error ?? {}
    throw new ApiError(res.status, e.code ?? 'error', e.message ?? `Request failed (${res.status})`, e.messageAr ?? 'حدث خطأ', e.details)
  }
  return data as T
}

const get = <T>(p: string, o?: Opts) => request<T>('GET', p, o)
const post = <T>(p: string, body: unknown = {}, o: Opts = {}) => request<T>('POST', p, { ...o, body })
const put = <T>(p: string, body: unknown = {}, o: Opts = {}) => request<T>('PUT', p, { ...o, body })
const patch = <T>(p: string, body: unknown = {}, o: Opts = {}) => request<T>('PATCH', p, { ...o, body })
const del = <T>(p: string, o?: Opts) => request<T>('DELETE', p, o)

export type PaymentStart = { provider: string; demo: boolean; kind: 'confirm' | 'redirect'; url?: string }

export const api = {
  bootstrap: () => get<any>('/catalog/bootstrap'),

  auth: {
    requestOtp: (phone: string) => post<{ sent: boolean; expiresIn: number; devMode: boolean }>('/auth/otp/request', { phone }, { auth: false }),
    async verifyOtp(phone: string, code: string, name?: string) {
      const s = await post<Session & { isNew: boolean }>('/auth/otp/verify', { phone, code, ...(name ? { name } : {}) }, { auth: false })
      save({ accessToken: s.accessToken, refreshToken: s.refreshToken, user: s.user })
      return s
    },
    async logout() {
      const s = session
      save(null)
      if (s) await post('/auth/logout', { refreshToken: s.refreshToken }, { auth: false }).catch(() => {})
    },
    /** Re-read the user (e.g. after a merchant application is approved). */
    async reload() { if (await tryRefresh()) return session!.user; return null },
  },

  me: {
    favorites: () => get<{ ids: string[] }>('/me/favorites'),
    addFavorite: (id: string) => put(`/me/favorites/${encodeURIComponent(id)}`),
    removeFavorite: (id: string) => del(`/me/favorites/${encodeURIComponent(id)}`),
    cart: () => get<{ items: CartLine[] }>('/me/cart'),
    saveCart: (items: Omit<CartLine, 'key'>[]) => put('/me/cart', { items }),
    occasions: () => get<{ items: { id: string; title: string; occasion: string; date: string; daysUntil: number }[] }>('/me/occasions'),
    addOccasion: (o: { title: string; occasion: string; date: string; recipient?: string }) => post<{ occasion: { id: string; title: string; occasion: string; date: string; daysUntil: number } }>('/me/occasions', o),
  },

  orders: {
    list: () => get<{ items: Order[] }>('/orders'),
    get: (id: string) => get<{ order: Order }>(`/orders/${encodeURIComponent(id)}`),
    create: (body: unknown) => post<{ order: Order; payment: PaymentStart }>('/orders', body),
    pay: (id: string) => post<{ order: Order }>(`/orders/${encodeURIComponent(id)}/pay`),
    cancel: (id: string) => post<{ order: Order }>(`/orders/${encodeURIComponent(id)}/cancel`),
    surprise: (id: string, token: string) => get<{ order: Order }>(`/surprise/${encodeURIComponent(id)}?token=${encodeURIComponent(token)}`, { auth: false }),
    reveal: (id: string, token: string) => post(`/surprise/${encodeURIComponent(id)}/reveal?token=${encodeURIComponent(token)}`, {}, { auth: false }),
    track: (id: string, token: string) => get<{ order: Order }>(`/track/${encodeURIComponent(id)}?token=${encodeURIComponent(token)}`, { auth: false }),
  },

  merchant: {
    orders: (merchantId?: string) => get<{ items: Order[] }>('/merchant/orders?limit=200', { merchantId }),
    setStatus: (orderId: string, to: string | undefined, merchantId?: string) =>
      post<{ order: Order }>(`/merchant/orders/${encodeURIComponent(orderId)}/status`, to ? { to } : {}, { merchantId }),
    products: (merchantId?: string) => get<{ items: any[] }>('/merchant/products', { merchantId }),
    updateProduct: (id: string, body: Record<string, unknown>, merchantId?: string) => patch(`/merchant/products/${encodeURIComponent(id)}`, body, { merchantId }),
  },

  promo: (code: string, items: Omit<CartLine, 'key'>[]) =>
    post<{ valid: boolean; promo?: { code: string; percent: number }; discount?: number; problem?: { message: string; messageAr: string } }>('/promo/validate', { code, items }),

  admin: {
    orders: () => get<{ items: Order[] }>('/admin/orders?limit=200'),
    setMerchantStatus: (id: string, status: 'active' | 'pending' | 'suspended') => patch(`/admin/merchants/${encodeURIComponent(id)}`, { status }),
    stats: (days = 30) => get<any>(`/admin/stats?days=${days}`),
  },

  ai: {
    bundles: (brief: Brief) => post<any>('/ai/bundles', { brief }),
  },

  /** Live updates (Server-Sent Events). Returns a close function. */
  stream(path: string, onEvent: (type: string, data: any) => void) {
    if (typeof EventSource === 'undefined') return () => {}
    const url = `${API_URL}/api/v1${path}${path.includes('?') ? '&' : '?'}${session ? `access_token=${encodeURIComponent(session.accessToken)}` : ''}`
    const es = new EventSource(url)
    for (const t of ['order.status', 'order.paid', 'order.cancelled', 'catalog.changed']) es.addEventListener(t, (e) => onEvent(t, JSON.parse((e as MessageEvent).data)))
    return () => es.close()
  },
}
