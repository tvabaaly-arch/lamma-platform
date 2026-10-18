import { isoLocal } from './dates'
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { PRODUCTS, productById, merchantById, type CityId, type OccasionId, type RecipientId, type Product, type AgeGroup, type Interest, type Relationship } from '../data/catalog'

export type Lang = 'ar' | 'en'
export type StatusId = 'placed' | 'accepted' | 'preparing' | 'ready' | 'out' | 'delivered'
export const STATUS_FLOW: StatusId[] = ['placed', 'accepted', 'preparing', 'ready', 'out', 'delivered']

export type CartLine = {
  key: string
  productId: string
  variant: Record<string, string>
  qty: number
  note?: string
  bundle?: string
}

export type OrderLine = CartLine & { unit: number; merchant: string }

export type Order = {
  id: string
  createdAt: number
  lines: OrderLine[]
  recipient: { name: string; phone: string; city: CityId; district: string; address: string }
  sender: { name: string }
  delivery: { date: string; slot: string }
  card: { design: number; message: string; from: string; hidePrice: boolean }
  surprise: boolean
  payment: string
  totals: { subtotal: number; delivery: number; discount: number; total: number }
  sub: Record<string, { status: StatusId; history: { status: StatusId; at: number }[] }>
  occasion?: OccasionId
  revealed?: boolean
}

export type Brief = { text: string; occasion: OccasionId; recipient: RecipientId; budget: number; city: CityId; date?: string; style?: string; age?: AgeGroup; interests?: Interest[]; relationship?: Relationship }

type Override = { stock?: number; price?: number; active?: boolean }

type State = {
  lang: Lang
  city: CityId
  cart: CartLine[]
  cartOpen: boolean
  favorites: string[]
  user: { name: string; phone: string; email?: string } | null
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
  placeOrder: (o: Omit<Order, 'id' | 'createdAt' | 'sub' | 'lines'> & { lines: CartLine[] }) => Order
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
  orders: seedOrders(),
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
      advance: (orderId, merchantId, to) =>
        set({
          orders: get().orders.map((o) => {
            if (o.id !== orderId || !o.sub[merchantId]) return o
            const cur = o.sub[merchantId]
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
      resetDemo: () => set({ ...initial, orders: seedOrders(), lang: get().lang, introSeen: true }),
    }),
    {
      name: 'lamma-demo-v3',
      storage: safeStorage,
      partialize: (s) => ({
        lang: s.lang, city: s.city, cart: s.cart, favorites: s.favorites, user: s.user, orders: s.orders,
        overrides: s.overrides, merchantSession: s.merchantSession, merchantStatus: s.merchantStatus, studio: s.studio, introSeen: s.introSeen,
      }),
    },
  ),
)

// Keep tabs in sync: a merchant updating an order in one tab updates customer tracking in another.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === 'lamma-demo-v3') useStore.persist.rehydrate()
  })
}

/* ---------- pricing helpers ---------- */
export function variantDelta(p: Product, variant: Record<string, string>) {
  return p.variants.reduce((sum, g) => sum + (g.options.find((o) => o.id === variant[g.key])?.delta ?? 0), 0)
}
export function basePrice(p: Product, overrides: Record<string, Override>) {
  return overrides[p.id]?.price ?? p.price
}
export function unitPrice(p: Product, variant: Record<string, string>, overrides: Record<string, Override>) {
  return basePrice(p, overrides) + variantDelta(p, variant)
}
export function stockOf(p: Product, overrides: Record<string, Override>) {
  return overrides[p.id]?.stock ?? p.stock
}
export function isAvailable(p: Product, overrides: Record<string, Override>) {
  return overrides[p.id]?.active !== false && stockOf(p, overrides) > 0
}
export function defaultVariant(p: Product) {
  const v: Record<string, string> = {}
  p.variants.forEach((g) => (v[g.key] = g.options[0].id))
  return v
}
export const DELIVERY_PER_MERCHANT = 20

export function cartTotals(cart: CartLine[], overrides: Record<string, Override>) {
  let subtotal = 0
  const merchants = new Set<string>()
  cart.forEach((l) => {
    const p = productById(l.productId)
    if (!p) return
    subtotal += unitPrice(p, l.variant, overrides) * l.qty
    merchants.add(p.merchant)
  })
  const delivery = merchants.size * DELIVERY_PER_MERCHANT
  return { subtotal, delivery, merchants: [...merchants], total: subtotal + delivery }
}

export function orderStatus(o: Order): StatusId {
  const idx = Math.min(...Object.values(o.sub).map((s) => STATUS_FLOW.indexOf(s.status)))
  return STATUS_FLOW[idx]
}

export const merchantName = (id: string) => merchantById(id)?.name
export const ALL_PRODUCTS = PRODUCTS
