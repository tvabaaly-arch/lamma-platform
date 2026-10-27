/*
 * Catalog cache. Products and merchants are read from Postgres and copied into the shared
 * catalog arrays from ../../src/data/catalog.ts, so the gift engine, collections and filters
 * behave exactly as they do in the web app. Refreshed after every catalog write (and on
 * `catalog.changed` events from other instances).
 */
import { asc } from 'drizzle-orm'
import {
  CATALOG, PRODUCTS, MERCHANTS, CATEGORIES, COLLECTIONS, inCategory,
  type Product, type Merchant, type CategoryId, type CollectionId, type CityId,
} from '../../../src/data/catalog'
import { db, schema } from '../db/client'
import { assetBase } from '../config'
import { toSar } from '../lib/money'

type MerchantRow = typeof schema.merchants.$inferSelect
type ProductRow = typeof schema.products.$inferSelect

export type MerchantState = { status: MerchantRow['status']; isPlaceholder: boolean }
export const merchantState = new Map<string, MerchantState>()
let version = 0
export const catalogVersion = () => version

export function rowToMerchant(m: MerchantRow): Merchant {
  return {
    id: m.id,
    name: { ar: m.nameAr, en: m.nameEn },
    tagline: { ar: m.taglineAr, en: m.taglineEn },
    about: { ar: m.aboutAr, en: m.aboutEn },
    cats: m.categories as CategoryId[],
    cities: m.cities as CityId[],
    rating: m.rating,
    reviews: m.reviews,
    since: m.since,
    hue: m.hue,
    initials: m.initials,
    prepTime: { ar: m.prepTimeAr, en: m.prepTimeEn },
    commission: m.commission,
  }
}

export function rowToProduct(p: ProductRow): Product {
  return {
    id: p.id,
    cat: p.category as CategoryId,
    merchant: p.merchantId,
    name: { ar: p.nameAr, en: p.nameEn },
    desc: { ar: p.descAr, en: p.descEn },
    price: toSar(p.priceHalalas),
    ...(p.wasHalalas ? { was: toSar(p.wasHalalas) } : {}),
    rating: p.rating,
    reviews: p.reviews,
    stock: p.stock,
    leadHours: p.leadHours,
    occasions: p.occasions as Product['occasions'],
    recipients: p.recipients as Product['recipients'],
    variants: p.variants,
    ...(p.personalize ? { personalize: p.personalize } : {}),
    art: p.art,
    ...(p.badge ? { badge: p.badge as Product['badge'] } : {}),
    created: p.createdAt.getTime(),
    ...(p.hidden ? { hidden: true } : {}),
    ...(p.extraCategories.length ? { extraCats: p.extraCategories as CategoryId[] } : {}),
    ...(p.ages ? { ages: p.ages as Product['ages'] } : {}),
    ...(p.interests ? { interests: p.interests as Product['interests'] } : {}),
  }
}

/** Absolute image URLs for apps that don't bundle the photos (mobile). */
export function imagesOf(p: Product) {
  if (p.art.url) return { full: p.art.url, sm: p.art.url }
  if (!p.art.img) return null
  const base = assetBase()
  return { full: `${base}products/${p.art.img}.webp`, sm: `${base}products/${p.art.img}-sm.webp` }
}

/** Product as returned by the API: the web app's Product shape plus availability and image URLs. */
export function publicProduct(p: Product) {
  return { ...p, images: imagesOf(p), available: isListed(p) && p.stock > 0 }
}

const activeIds = new Set<string>()
export const isMerchantActive = (id: string) => merchantState.get(id)?.status === 'active'
export const isListed = (p: Product) => activeIds.has(p.id) && !p.hidden && isMerchantActive(p.merchant)

export async function refreshCatalog() {
  const [mRows, pRows, cRows] = await Promise.all([
    db.select().from(schema.merchants).orderBy(asc(schema.merchants.createdAt)),
    db.select().from(schema.products).orderBy(asc(schema.products.createdAt)),
    db.select().from(schema.categories).orderBy(asc(schema.categories.sort)),
  ])
  merchantState.clear()
  mRows.forEach((m) => merchantState.set(m.id, { status: m.status, isPlaceholder: m.isPlaceholder }))
  activeIds.clear()
  pRows.forEach((p) => { if (p.active) activeIds.add(p.id) })
  const all = pRows.map(rowToProduct)
  MERCHANTS.splice(0, MERCHANTS.length, ...mRows.map(rowToMerchant))
  CATALOG.splice(0, CATALOG.length, ...all)
  PRODUCTS.splice(0, PRODUCTS.length, ...all.filter(isListed))
  if (cRows.length) {
    CATEGORIES.splice(0, CATEGORIES.length, ...cRows.map((c) => ({
      id: c.id as CategoryId, name: { ar: c.nameAr, en: c.nameEn }, blurb: { ar: c.blurbAr, en: c.blurbEn }, art: c.art,
    })))
  }
  version++
}

export type ProductQuery = {
  cat?: CategoryId
  for?: CollectionId
  merchant?: string
  city?: CityId
  occasion?: string
  recipient?: string
  age?: string
  q?: string
  min?: number
  max?: number
  sameDay?: boolean
  ids?: string[]
  sort?: 'popular' | 'new' | 'price-asc' | 'price-desc' | 'rating'
  page: number
  limit: number
}

const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[ً-ْـ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي')

export function queryProducts(q: ProductQuery) {
  let list = PRODUCTS.slice()
  if (q.ids) { const set = new Set(q.ids); list = list.filter((p) => set.has(p.id)) }
  if (q.cat) list = list.filter((p) => inCategory(p, q.cat!))
  if (q.for) { const col = COLLECTIONS.find((c) => c.id === q.for); if (col) list = list.filter(col.match) }
  if (q.merchant) list = list.filter((p) => p.merchant === q.merchant)
  if (q.city) list = list.filter((p) => MERCHANTS.find((m) => m.id === p.merchant)?.cities.includes(q.city!))
  if (q.occasion) list = list.filter((p) => p.occasions.includes(q.occasion as never))
  if (q.recipient) list = list.filter((p) => p.recipients.includes(q.recipient as never))
  if (q.age) list = list.filter((p) => !p.ages || p.ages.includes(q.age as never))
  if (q.min != null) list = list.filter((p) => p.price >= q.min!)
  if (q.max != null) list = list.filter((p) => p.price <= q.max!)
  if (q.sameDay) list = list.filter((p) => p.leadHours <= 4)
  if (q.q) {
    const terms = norm(q.q).split(/\s+/).filter(Boolean)
    list = list.filter((p) => {
      const m = MERCHANTS.find((x) => x.id === p.merchant)
      const hay = norm([p.name.ar, p.name.en, p.desc.ar, p.desc.en, m?.name.ar, m?.name.en, p.cat].join(' '))
      return terms.every((t) => hay.includes(t))
    })
  }
  const sorters: Record<NonNullable<ProductQuery['sort']>, (a: Product, b: Product) => number> = {
    popular: (a, b) => b.reviews * b.rating - a.reviews * a.rating,
    new: (a, b) => b.created - a.created,
    'price-asc': (a, b) => a.price - b.price,
    'price-desc': (a, b) => b.price - a.price,
    rating: (a, b) => b.rating - a.rating || b.reviews - a.reviews,
  }
  list.sort(sorters[q.sort ?? 'popular'])
  const total = list.length
  const start = (q.page - 1) * q.limit
  return { total, page: q.page, limit: q.limit, items: list.slice(start, start + q.limit).map(publicProduct) }
}

export const productFromCache = (id: string) => CATALOG.find((p) => p.id === id)
export const merchantFromCache = (id: string) => MERCHANTS.find((m) => m.id === id)
