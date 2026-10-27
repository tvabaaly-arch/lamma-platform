/*
 * Shared domain model: order types and pricing rules used by the web app, the gift engine and the API server.
 * Keep this file free of browser-only code so the server can import it.
 */
import { productById, type CityId, type OccasionId, type RecipientId, type Product, type AgeGroup, type Interest, type Relationship } from '../data/catalog'

export type StatusId = 'placed' | 'accepted' | 'preparing' | 'ready' | 'out' | 'delivered'
export const STATUS_FLOW: StatusId[] = ['placed', 'accepted', 'preparing', 'ready', 'out', 'delivered']
/** Final states that only happen with the live API (a store rejects, or the order is cancelled). */
export type ClosedStatus = 'rejected' | 'cancelled'
export type SubStatus = StatusId | ClosedStatus
export const isClosed = (s: string): s is ClosedStatus => s === 'rejected' || s === 'cancelled'

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
  sub: Record<string, { status: SubStatus; history: { status: SubStatus; at: number }[] }>
  occasion?: OccasionId
  revealed?: boolean
  /* Present on orders loaded from the API */
  publicToken?: string
  paymentStatus?: 'pending' | 'paid' | 'failed' | 'refunded' | 'expired'
  cancelled?: boolean
}

export type Brief = { text: string; occasion: OccasionId; recipient: RecipientId; budget: number; city: CityId; date?: string; style?: string; age?: AgeGroup; interests?: Interest[]; relationship?: Relationship }

export type Override = { stock?: number; price?: number; active?: boolean }

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

/** Delivery windows. A slot is bookable when its end (start + 4h) is at least the cart's longest prep time away. */
export const SLOTS = [
  { id: '10:00–14:00', start: 10, ar: 'صباحاً ١٠–٢', en: 'Morning 10–2' },
  { id: '14:00–18:00', start: 14, ar: 'عصراً ٢–٦', en: 'Afternoon 2–6' },
  { id: '18:00–22:00', start: 18, ar: 'مساءً ٦–١٠', en: 'Evening 6–10' },
]
export type SlotId = (typeof SLOTS)[number]['id']

export const PAYMENT_METHODS = ['mada', 'apple', 'stc', 'tabby'] as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

/** Promo codes known to the demo storefront (the API keeps its own table). */
export const DEMO_PROMOS: Record<string, number> = { LAMMA10: 0.1 }

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

export function orderStatus(o: Order): SubStatus {
  const open = Object.values(o.sub).filter((x) => !isClosed(x.status))
  if (!open.length) return Object.values(o.sub).some((x) => x.status === 'rejected') ? 'rejected' : 'cancelled'
  return STATUS_FLOW[Math.min(...open.map((x) => STATUS_FLOW.indexOf(x.status as StatusId)))]
}

