/*
 * Connects the storefront to the LAMMA API (API mode only).
 * - Loads the catalogue from the server into the shared catalogue arrays before the app renders.
 * - Keeps orders/favourites in the store in sync for the signed-in role (customer, merchant, admin).
 * - Sends dashboard actions (status updates, stock/price, store approval) to the server.
 * Pages keep using the same store API as the offline demo.
 */
import { useEffect } from 'react'
import { CATALOG, PRODUCTS, MERCHANTS, MERCHANT_ARCHIVE, CATEGORIES, type Merchant } from '../data/catalog'
import { api, apiMode, getSession, onSession, ApiError } from './api'
import { useStore } from './store'
import type { Order } from './model'

export const server = { devOtpCode: null as string | null, ready: false }

const errText = (e: unknown) => {
  const lang = useStore.getState().lang
  return e instanceof ApiError ? e.text(lang) : lang === 'ar' ? 'حدث خطأ غير متوقع' : 'Something went wrong'
}
const toastError = (e: unknown) => useStore.getState().showToast(errText(e))

/* ---------------------------------------------------------------- catalogue */

export async function bootstrapCatalog() {
  const d = await api.bootstrap()
  const listed = d.products as typeof PRODUCTS
  CATALOG.splice(0, CATALOG.length, ...listed, ...(d.archived as typeof PRODUCTS))
  PRODUCTS.splice(0, PRODUCTS.length, ...listed)
  const merchants = d.merchants as (Merchant & { status: 'active' | 'pending' | 'suspended' })[]
  MERCHANTS.splice(0, MERCHANTS.length, ...merchants.filter((m) => m.status === 'active'))
  MERCHANT_ARCHIVE.splice(0, MERCHANT_ARCHIVE.length, ...merchants.filter((m) => m.status !== 'active'))
  CATEGORIES.splice(0, CATEGORIES.length, ...d.categories.map(({ image: _i, ...c }: any) => c))
  server.devOtpCode = d.devOtpCode ?? null
  const st = useStore.getState()
  useStore.setState({
    merchantStatus: Object.fromEntries(merchants.map((m) => [m.id, m.status])),
    overrides: {},
    // drop cart lines for products that no longer exist
    cart: st.cart.filter((l) => CATALOG.some((p) => p.id === l.productId)),
  })
}

/* ---------------------------------------------------------------- session data */

let closeStream: (() => void) | null = null
let refreshTimer: ReturnType<typeof setTimeout> | null = null

async function loadForRole() {
  const s = getSession()
  if (!s) return
  const { role, merchantId } = s.user
  if (role === 'customer') {
    const [orders, favs] = await Promise.all([api.orders.list(), api.me.favorites()])
    useStore.setState({ orders: orders.items, favorites: favs.ids })
  } else if (role === 'merchant') {
    const [orders, products] = await Promise.all([api.merchant.orders(), api.merchant.products()])
    // Inactive products aren't in the public catalogue; keep them visible (switched off) in the dashboard.
    for (const p of products.items) if (!CATALOG.some((x) => x.id === p.id)) CATALOG.push(p)
    const overrides = { ...useStore.getState().overrides }
    for (const p of products.items) if (p.active === false) overrides[p.id] = { ...overrides[p.id], active: false }
    useStore.setState({ orders: orders.items, overrides, merchantSession: merchantId ?? useStore.getState().merchantSession })
  } else {
    const orders = await api.admin.orders()
    useStore.setState({ orders: orders.items })
  }
}

export function refreshData(delay = 0) {
  if (refreshTimer) clearTimeout(refreshTimer)
  refreshTimer = setTimeout(() => { loadForRole().catch(() => {}) }, delay)
}

async function applySession() {
  closeStream?.()
  closeStream = null
  const s = getSession()
  if (!s) {
    useStore.setState({ user: null, orders: [], favorites: [] })
    return
  }
  const u = s.user
  useStore.setState({ user: { name: u.name ?? u.phone, phone: u.phone, email: u.email ?? undefined, role: u.role, merchantId: u.merchantId } })
  await loadForRole().catch(toastError)
  if (u.role === 'merchant') closeStream = api.stream('/merchant/stream', () => refreshData(150))
  syncCartFromServer().catch(() => {})
}

/* ---- cart: shared between web and mobile when signed in as a customer ---- */
let cartPush: ReturnType<typeof setTimeout> | null = null
let applyingServerCart = false
async function syncCartFromServer() {
  if (getSession()?.user.role !== 'customer') return
  const local = useStore.getState().cart
  const remote = await api.me.cart()
  if (!local.length && remote.items.length) {
    applyingServerCart = true
    useStore.setState({ cart: remote.items.map((l, i) => ({ ...l, key: `${l.productId}|${JSON.stringify(l.variant)}|${l.note ?? ''}|${l.bundle ?? ''}|${i}` })) })
    applyingServerCart = false
  } else if (local.length) pushCart()
}
function pushCart() {
  if (getSession()?.user.role !== 'customer') return
  if (cartPush) clearTimeout(cartPush)
  cartPush = setTimeout(() => {
    api.me.saveCart(useStore.getState().cart.map(({ key: _k, ...l }) => l)).catch(() => {})
  }, 800)
}

/* ---------------------------------------------------------------- actions */

function wrapActions() {
  const orig = useStore.getState()
  const isAdmin = () => getSession()?.user.role === 'admin'
  const pendingProduct = new Map<string, ReturnType<typeof setTimeout>>()

  useStore.setState({
    advance: (orderId, merchantId, to) => {
      orig.advance(orderId, merchantId, to) // optimistic
      api.merchant.setStatus(orderId, to, isAdmin() ? merchantId : undefined)
        .then(() => refreshData())
        .catch((e) => { toastError(e); refreshData() })
    },
    setOverride: (pid, ov) => {
      orig.setOverride(pid, ov)
      const p = CATALOG.find((x) => x.id === pid)
      if (pendingProduct.has(pid)) clearTimeout(pendingProduct.get(pid)!)
      pendingProduct.set(pid, setTimeout(() => {
        pendingProduct.delete(pid)
        const cur = useStore.getState().overrides[pid] ?? {}
        const body: Record<string, unknown> = {}
        if (cur.price !== undefined) body.price = cur.price
        if (cur.stock !== undefined) body.stock = cur.stock
        if (cur.active !== undefined) body.active = cur.active
        api.merchant.updateProduct(pid, body, isAdmin() ? p?.merchant : undefined).catch(toastError)
      }, 600))
    },
    setMerchantStatus: (id, status) => {
      orig.setMerchantStatus(id, status)
      api.admin.setMerchantStatus(id, status).then(() => bootstrapCatalog()).catch((e) => { toastError(e); bootstrapCatalog().catch(() => {}) })
    },
    toggleFav: (id) => {
      const was = useStore.getState().favorites.includes(id)
      orig.toggleFav(id)
      if (getSession()) (was ? api.me.removeFavorite(id) : api.me.addFavorite(id)).catch(toastError)
    },
    markRevealed: (orderId) => {
      orig.markRevealed(orderId)
      const o = useStore.getState().orders.find((x) => x.id === orderId)
      if (o?.publicToken) api.orders.reveal(orderId, o.publicToken).catch(() => {})
    },
    logout: () => { void api.auth.logout() },
    resetDemo: () => { bootstrapCatalog().then(() => refreshData()).catch(toastError) },
  })
}

/* ---------------------------------------------------------------- start */

export async function startSync() {
  if (!apiMode) return
  await bootstrapCatalog()
  wrapActions()
  onSession(() => { void applySession() })
  await applySession()
  useStore.subscribe((s, prev) => { if (s.cart !== prev.cart && !applyingServerCart) pushCart() })
  const tick = () => { if (document.visibilityState === 'visible') refreshData() }
  setInterval(tick, 20_000)
  window.addEventListener('focus', tick)
  server.ready = true
}

/** Live updates for one order page (customer view). */
export function useLiveOrder(order: Order | undefined) {
  const id = order?.id
  useEffect(() => {
    if (!apiMode || !id || !getSession()) return
    return api.stream(`/orders/${encodeURIComponent(id)}/stream`, () => refreshData(100))
  }, [id])
}
