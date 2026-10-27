import { isoLocal } from './dates'
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { PRODUCTS, productById, merchantById, type CityId, type OccasionId, type RecipientId, type Product, type AgeGroup, type Interest, type Relationship } from '../data/catalog'

export type Lang = 'ar' | 'en'
export * from './model'
import { STATUS_FLOW, unitPrice, type StatusId, type CartLine, type OrderLine, type Order, type Brief, type Override } from './model'
import { api, apiMode, type Role } from './api'

export type NewOrder = Omit<Order, 'id' | 'createdAt' | 'sub' | 'lines'> & { lines: CartLine[]; promoCode?: string }

type State = {
  lang: Lang
  city: CityId
  cart: CartLine[]
  cartOpen: boolean
  favorites: string[]
  user: { name: string; phone: string; email?: string; role?: Role; merchantId?: string | null } | null
  orders: Order[]
  overrides: Record<string, Override>
  merchantSession: string
  merchantStatus: Record<string, 'active' | 'pending' | 'suspended'>
  studio: { brief: Brief | null; bundlesGenerated: number }
  toast: { id: number; text: string } | null
  introSeen: boolean

  setLang: (l: Lang) => void
  setCity: (c: CityId) => void
  addToCart: (line: Omit<CartLine, 'key'>, silent?: boolean) => void
  addManyToCart: (lines: Omit<CartLine, 'key'>[]) => void
  updateQty: (key: string, qty: number) => void
  removeLine: (key: string) => void
  clearCart: () => void
  setCartOpen: (o: boolean) => void
  toggleFav: (id: string) => void
  login: (u: State['user']) => void
  logout: () => void
  placeOrder: (o: NewOrder) => Order
  /** Demo: places the order locally. API mode: creates it on the server and confirms the (demo) payment. */
  placeOrderAsync: (o: NewOrder) => Promise<Order>
  advance: (orderId: string, merchantId: string, to?: StatusId) => void
  markRevealed: (orderId: string) => void
  setOverride: (pid: string, o: Override) => void
  setMerchantSession: (id: string) => void
  setMerchantStatus: (id: string, s: 'active' | 'pending' | 'suspended') => void
  setBrief: (b: Brief) => void
  showToast: (text: string) => void
  setIntroSeen: () => void
  resetDemo: () => void
}

/** localStorage wrapper that never throws (private mode, blocked storage, sandboxed frames). */
const safeStorage = createJSONStorage(() => ({
  getItem: (k: string) => { try { return localStorage.getItem(k) } catch { return null } },
  setItem: (k: string, v: string) => { try { localStorage.setItem(k, v) } catch { /* ignore */ } },
  removeItem: (k: string) => { try { localStorage.removeItem(k) } catch { /* ignore */ } },
}))

const lineKey = (l: Omit<CartLine, 'key'>) =>
  [l.productId, JSON.stringify(l.variant), l.note ?? '', l.bundle ?? ''].join('|')

/* Seed: two historical demo orders so dashboards are alive on first load */
function seedOrders(): Order[] {
  const now = Date.now()
  const mk = (id: string, hoursAgo: number, pids: [string, number][], city: CityId, status: StatusId, name: string): Order => {
    const lines: OrderLine[] = pids.map(([pid, qty]) => {
      const p = productById(pid)!
      return { key: pid, productId: pid, variant: {}, qty, unit: p.price, merchant: p.merchant }
    })
    const subtotal = lines.reduce((a, l) => a + l.unit * l.qty, 0)
    const merchants = [...new Set(lines.map((l) => l.merchant))]
    const idx = STATUS_FLOW.indexOf(status)
    const sub: Order['sub'] = {}
    merchants.forEach((m) => {
      sub[m] = { status, history: STATUS_FLOW.slice(0, idx + 1).map((s, i) => ({ status: s, at: now - hoursAgo * 3600e3 + i * 40 * 60e3 })) }
    })
    const delivery = merchants.length * 20
    return {
      id, createdAt: now - hoursAgo * 3600e3, lines,
      recipient: { name, phone: '05X XXX XXXX', city, district: 'حي النرجس', address: '—' },
      sender: { name: 'عميل تجريبي' },
      delivery: { date: isoLocal(new Date(now + 86400e3)), slot: '16:00–20:00' },
      card: { design: 0, message: 'كل عام وأنتِ بخير', from: 'سارة', hidePrice: true },
      surprise: true, payment: 'mada',
      totals: { subtotal, delivery, discount: 0, total: subtotal + delivery }, sub,
    }
  }
  return [
    mk('LM-24817', 30, [['ph01', 1], ['ph09', 1]], 'riyadh', 'delivered', 'هيفاء'),
    mk('LM-24852', 3, [['ph17', 2], ['p042', 1]], 'riyadh', 'preparing', 'خالد'),
    mk('LM-24860', 1, [['ph04', 1]], 'jeddah', 'placed', 'لمى'),
  ]
}

const initial = {
  lang: 'ar' as Lang,
  city: 'riyadh' as CityId,
  cart: [] as CartLine[],
  cartOpen: false,
  favorites: ['ph04', 'ph21', 'p041'] as string[],
  user: null,
  orders: apiMode ? [] : seedOrders(),
  overrides: {} as Record<string, Override>,
  merchantSession: 'reem',
  merchantStatus: { reem: 'active', sukkar: 'active', najd: 'active', farha: 'active', sahra: 'active', oudbox: 'active', haladar: 'active', naqsh: 'active', batla: 'active', qamariya: 'pending' } as State['merchantStatus'],
  studio: { brief: null, bundlesGenerated: 1284 },
  toast: null,
  introSeen: false,
}

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      ...initial,
      setLang: (lang) => set({ lang }),
      setCity: (city) => set({ city }),
      addToCart: (line, silent) => {
        const key = lineKey(line)
        const cart = [...get().cart]
        const ex = cart.find((c) => c.key === key)
        if (ex) ex.qty += line.qty
        else cart.push({ ...line, key })
        set({ cart, cartOpen: !silent })
      },
      addManyToCart: (lines) => {
        lines.forEach((l) => get().addToCart(l, true))
        set({ cartOpen: true })
      },
      updateQty: (key, qty) => set({ cart: get().cart.map((c) => (c.key === key ? { ...c, qty: Math.max(1, Math.min(20, qty)) } : c)) }),
      removeLine: (key) => set({ cart: get().cart.filter((c) => c.key !== key) }),
      clearCart: () => set({ cart: [] }),
      setCartOpen: (cartOpen) => set({ cartOpen }),
      toggleFav: (id) => {
        const f = get().favorites
        set({ favorites: f.includes(id) ? f.filter((x) => x !== id) : [...f, id] })
      },
      login: (user) => set({ user }),
      logout: () => set({ user: null }),
      placeOrder: (o) => {
        const id = 'LM-' + String(24861 + get().orders.length + Math.floor(Math.random() * 90)).padStart(5, '0')
        const lines: OrderLine[] = o.lines.map((l) => {
          const p = productById(l.productId)!
          return { ...l, unit: unitPrice(p, l.variant, get().overrides), merchant: p.merchant }
        })
        const now = Date.now()
        const sub: Order['sub'] = {}
        ;[...new Set(lines.map((l) => l.merchant))].forEach((m) => (sub[m] = { status: 'placed', history: [{ status: 'placed', at: now }] }))
        // decrement inventory
        const overrides = { ...get().overrides }
        lines.forEach((l) => {
          const p = productById(l.productId)!
          const cur = overrides[p.id]?.stock ?? p.stock
          overrides[p.id] = { ...overrides[p.id], stock: Math.max(0, cur - l.qty) }
        })
        const order: Order = { ...o, id, createdAt: now, lines, sub }
        set({ orders: [order, ...get().orders], cart: [], overrides })
        return order
      },
      placeOrderAsync: async (o) => {
        if (!apiMode) {
          await new Promise((r) => setTimeout(r, 1600))
          return get().placeOrder(o)
        }
        const { order, payment } = await api.orders.create({
          lines: o.lines.map(({ productId, variant, qty, note, bundle }) => ({ productId, variant, qty, ...(note ? { note } : {}), ...(bundle ? { bundle } : {}) })),
          recipient: o.recipient, sender: o.sender, delivery: o.delivery, card: o.card, surprise: o.surprise,
          ...(o.occasion ? { occasion: o.occasion } : {}), ...(o.promoCode ? { promoCode: o.promoCode } : {}), payment: o.payment,
        })
        if (payment.kind === 'redirect' && payment.url) { window.location.href = payment.url; return order }
        const paid = (await api.orders.pay(order.id)).order
        set({ orders: [paid, ...get().orders.filter((x) => x.id !== paid.id)], cart: [] })
        return paid
      },
      advance: (orderId, merchantId, to) =>
        set({
          orders: get().orders.map((o) => {
            if (o.id !== orderId || !o.sub[merchantId]) return o
            const cur = o.sub[merchantId]
            if (cur.status === 'rejected' || cur.status === 'cancelled') return o
            const next = to ?? STATUS_FLOW[Math.min(STATUS_FLOW.length - 1, STATUS_FLOW.indexOf(cur.status) + 1)]
            if (next === cur.status) return o
            return { ...o, sub: { ...o.sub, [merchantId]: { status: next, history: [...cur.history, { status: next, at: Date.now() }] } } }
          }),
        }),
      markRevealed: (orderId) => set({ orders: get().orders.map((o) => (o.id === orderId ? { ...o, revealed: true } : o)) }),
      setOverride: (pid, ov) => set({ overrides: { ...get().overrides, [pid]: { ...get().overrides[pid], ...ov } } }),
      setMerchantSession: (merchantSession) => set({ merchantSession }),
      setMerchantStatus: (id, s) => set({ merchantStatus: { ...get().merchantStatus, [id]: s } }),
      setBrief: (brief) => set({ studio: { brief, bundlesGenerated: get().studio.bundlesGenerated + 1 } }),
      showToast: (text) => set({ toast: { id: Date.now(), text } }),
      setIntroSeen: () => set({ introSeen: true }),
      resetDemo: () => set({ ...initial, orders: apiMode ? [] : seedOrders(), lang: get().lang, introSeen: true }),
    }),
    {
      // The live-API build keeps its state apart from the offline demo's.
      name: apiMode ? 'lamma-api-v1' : 'lamma-demo-v3',
      storage: safeStorage,
      partialize: (s) => apiMode
        // Orders, stock and the signed-in user come from the server; only UI preferences and the cart stay local.
        ? { lang: s.lang, city: s.city, cart: s.cart, merchantSession: s.merchantSession, studio: s.studio, introSeen: s.introSeen }
        : {
          lang: s.lang, city: s.city, cart: s.cart, favorites: s.favorites, user: s.user, orders: s.orders,
          overrides: s.overrides, merchantSession: s.merchantSession, merchantStatus: s.merchantStatus, studio: s.studio, introSeen: s.introSeen,
        },
    },
  ),
)

// Keep tabs in sync: a merchant updating an order in one tab updates customer tracking in another.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === (apiMode ? 'lamma-api-v1' : 'lamma-demo-v3')) useStore.persist.rehydrate()
  })
}

export const merchantName = (id: string) => merchantById(id)?.name
export const ALL_PRODUCTS = PRODUCTS
