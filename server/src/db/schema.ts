import { sql } from 'drizzle-orm'
import {
  pgTable, pgEnum, pgSequence, text, integer, real, boolean, jsonb, timestamp, uuid, serial, primaryKey, index, uniqueIndex,
} from 'drizzle-orm/pg-core'
import type { Art, L, VariantGroup } from '../../../src/data/catalog'

export const userRole = pgEnum('user_role', ['customer', 'merchant', 'admin'])
export const merchantStatus = pgEnum('merchant_status', ['active', 'pending', 'suspended'])
export const subOrderStatus = pgEnum('sub_order_status', ['placed', 'accepted', 'preparing', 'ready', 'out', 'delivered', 'rejected', 'cancelled'])
export const paymentStatus = pgEnum('payment_status', ['pending', 'paid', 'failed', 'refunded', 'expired'])
export const applicationStatus = pgEnum('application_status', ['pending', 'approved', 'rejected'])

/** Human-friendly order numbers: LM-248001, LM-248002 … */
export const orderNumberSeq = pgSequence('order_number_seq', { startWith: 248001 })

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: 'date' })
const created = () => ts('created_at').notNull().defaultNow()

export const merchants = pgTable('merchants', {
  id: text('id').primaryKey(),
  nameAr: text('name_ar').notNull(),
  nameEn: text('name_en').notNull(),
  taglineAr: text('tagline_ar').notNull().default(''),
  taglineEn: text('tagline_en').notNull().default(''),
  aboutAr: text('about_ar').notNull().default(''),
  aboutEn: text('about_en').notNull().default(''),
  categories: text('categories').array().notNull().default(sql`'{}'`),
  cities: text('cities').array().notNull().default(sql`'{}'`),
  rating: real('rating').notNull().default(0),
  reviews: integer('reviews').notNull().default(0),
  since: integer('since').notNull(),
  hue: integer('hue').notNull().default(0),
  initials: text('initials').notNull(),
  prepTimeAr: text('prep_time_ar').notNull().default(''),
  prepTimeEn: text('prep_time_en').notNull().default(''),
  commission: real('commission').notNull().default(0.15),
  status: merchantStatus('status').notNull().default('pending'),
  /** Temporary demo merchant — replace once real merchants are approved. */
  isPlaceholder: boolean('is_placeholder').notNull().default(false),
  contactPhone: text('contact_phone'),
  contactEmail: text('contact_email'),
  crNumber: text('cr_number'),
  createdAt: created(),
  updatedAt: ts('updated_at').notNull().defaultNow(),
})

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  phone: text('phone').notNull().unique(),
  name: text('name'),
  email: text('email'),
  role: userRole('role').notNull().default('customer'),
  merchantId: text('merchant_id').references(() => merchants.id, { onDelete: 'set null' }),
  lang: text('lang').notNull().default('ar'),
  isDemo: boolean('is_demo').notNull().default(false),
  createdAt: created(),
  lastLoginAt: ts('last_login_at'),
})

export const otpCodes = pgTable('otp_codes', {
  id: serial('id').primaryKey(),
  phone: text('phone').notNull(),
  codeHash: text('code_hash').notNull(),
  attempts: integer('attempts').notNull().default(0),
  expiresAt: ts('expires_at').notNull(),
  consumedAt: ts('consumed_at'),
  createdAt: created(),
}, (t) => [index('otp_phone_idx').on(t.phone, t.createdAt)])

export const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: ts('expires_at').notNull(),
  revokedAt: ts('revoked_at'),
  userAgent: text('user_agent'),
  createdAt: created(),
})

export const categories = pgTable('categories', {
  id: text('id').primaryKey(),
  nameAr: text('name_ar').notNull(),
  nameEn: text('name_en').notNull(),
  blurbAr: text('blurb_ar').notNull().default(''),
  blurbEn: text('blurb_en').notNull().default(''),
  art: jsonb('art').$type<Art>().notNull(),
  sort: integer('sort').notNull().default(0),
})

export const products = pgTable('products', {
  id: text('id').primaryKey(),
  merchantId: text('merchant_id').notNull().references(() => merchants.id, { onDelete: 'cascade' }),
  category: text('category').notNull().references(() => categories.id),
  extraCategories: text('extra_categories').array().notNull().default(sql`'{}'`),
  nameAr: text('name_ar').notNull(),
  nameEn: text('name_en').notNull(),
  descAr: text('desc_ar').notNull().default(''),
  descEn: text('desc_en').notNull().default(''),
  /** Prices are stored in halalas (1 SAR = 100 halalas) to avoid floating-point money. */
  priceHalalas: integer('price_halalas').notNull(),
  wasHalalas: integer('was_halalas'),
  rating: real('rating').notNull().default(0),
  reviews: integer('reviews').notNull().default(0),
  stock: integer('stock').notNull().default(0),
  leadHours: integer('lead_hours').notNull().default(24),
  occasions: text('occasions').array().notNull().default(sql`'{}'`),
  recipients: text('recipients').array().notNull().default(sql`'{}'`),
  ages: text('ages').array(),
  interests: text('interests').array(),
  variants: jsonb('variants').$type<VariantGroup[]>().notNull().default([]),
  personalize: jsonb('personalize').$type<L>(),
  art: jsonb('art').$type<Art>().notNull(),
  badge: text('badge'),
  active: boolean('active').notNull().default(true),
  /** Legacy illustrated item kept for old orders but not shown in the storefront. */
  hidden: boolean('hidden').notNull().default(false),
  createdAt: created(),
  updatedAt: ts('updated_at').notNull().defaultNow(),
}, (t) => [index('products_merchant_idx').on(t.merchantId), index('products_category_idx').on(t.category)])

export type Party = { name: string; phone: string; city: string; district: string; address: string }
export type CardData = { design: number; message: string; from: string; hidePrice: boolean }

export const orders = pgTable('orders', {
  id: text('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id),
  /** Secret used in shareable tracking / surprise links. */
  publicToken: text('public_token').notNull().unique(),
  recipient: jsonb('recipient').$type<Party>().notNull(),
  senderName: text('sender_name').notNull(),
  city: text('city').notNull(),
  deliveryDate: text('delivery_date').notNull(),
  deliverySlot: text('delivery_slot').notNull(),
  card: jsonb('card').$type<CardData>().notNull(),
  surprise: boolean('surprise').notNull().default(true),
  revealedAt: ts('revealed_at'),
  occasion: text('occasion'),
  promoCode: text('promo_code'),
  paymentMethod: text('payment_method').notNull(),
  paymentProvider: text('payment_provider').notNull(),
  paymentStatus: paymentStatus('payment_status').notNull().default('pending'),
  paymentRef: text('payment_ref'),
  subtotal: integer('subtotal').notNull(),
  deliveryFee: integer('delivery_fee').notNull(),
  discount: integer('discount').notNull().default(0),
  total: integer('total').notNull(),
  createdAt: created(),
  paidAt: ts('paid_at'),
  cancelledAt: ts('cancelled_at'),
}, (t) => [index('orders_user_idx').on(t.userId, t.createdAt), index('orders_created_idx').on(t.createdAt)])

export const orderItems = pgTable('order_items', {
  id: serial('id').primaryKey(),
  orderId: text('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  merchantId: text('merchant_id').notNull().references(() => merchants.id),
  productId: text('product_id').notNull().references(() => products.id),
  nameAr: text('name_ar').notNull(),
  nameEn: text('name_en').notNull(),
  category: text('category').notNull(),
  variant: jsonb('variant').$type<Record<string, string>>().notNull().default({}),
  qty: integer('qty').notNull(),
  unitPrice: integer('unit_price').notNull(),
  note: text('note'),
  bundle: text('bundle'),
}, (t) => [index('order_items_order_idx').on(t.orderId)])

export const subOrders = pgTable('sub_orders', {
  id: serial('id').primaryKey(),
  orderId: text('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  merchantId: text('merchant_id').notNull().references(() => merchants.id),
  status: subOrderStatus('status').notNull().default('placed'),
  subtotal: integer('subtotal').notNull(),
  deliveryFee: integer('delivery_fee').notNull(),
  commissionRate: real('commission_rate').notNull(),
  commission: integer('commission').notNull(),
  updatedAt: ts('updated_at').notNull().defaultNow(),
}, (t) => [uniqueIndex('sub_orders_order_merchant_uq').on(t.orderId, t.merchantId), index('sub_orders_merchant_idx').on(t.merchantId, t.status)])

export const orderEvents = pgTable('order_events', {
  id: serial('id').primaryKey(),
  orderId: text('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  merchantId: text('merchant_id'),
  status: text('status').notNull(),
  note: text('note'),
  actorUserId: uuid('actor_user_id'),
  at: ts('at').notNull().defaultNow(),
}, (t) => [index('order_events_order_idx').on(t.orderId, t.at)])

export const favorites = pgTable('favorites', {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  createdAt: created(),
}, (t) => [primaryKey({ columns: [t.userId, t.productId] })])

export type CartItem = { productId: string; variant: Record<string, string>; qty: number; note?: string; bundle?: string }

export const carts = pgTable('carts', {
  userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  items: jsonb('items').$type<CartItem[]>().notNull().default([]),
  updatedAt: ts('updated_at').notNull().defaultNow(),
})

export const addresses = pgTable('addresses', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  label: text('label').notNull(),
  name: text('name').notNull(),
  phone: text('phone').notNull(),
  city: text('city').notNull(),
  district: text('district').notNull(),
  address: text('address').notNull().default(''),
  createdAt: created(),
})

export const savedOccasions = pgTable('saved_occasions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  occasion: text('occasion').notNull(),
  recipient: text('recipient'),
  /** YYYY-MM-DD; for yearly occasions the year is ignored when computing reminders. */
  date: text('date').notNull(),
  yearly: boolean('yearly').notNull().default(true),
  remindDays: integer('remind_days').notNull().default(3),
  note: text('note'),
  createdAt: created(),
})

export const promoCodes = pgTable('promo_codes', {
  code: text('code').primaryKey(),
  percent: integer('percent').notNull(),
  maxDiscount: integer('max_discount'),
  minSubtotal: integer('min_subtotal').notNull().default(0),
  usageLimit: integer('usage_limit'),
  usedCount: integer('used_count').notNull().default(0),
  active: boolean('active').notNull().default(true),
  expiresAt: ts('expires_at'),
  createdAt: created(),
})

export const merchantApplications = pgTable('merchant_applications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  storeNameAr: text('store_name_ar').notNull(),
  storeNameEn: text('store_name_en').notNull(),
  categories: text('categories').array().notNull(),
  cities: text('cities').array().notNull(),
  contactName: text('contact_name').notNull(),
  phone: text('phone').notNull(),
  email: text('email'),
  crNumber: text('cr_number'),
  about: text('about').notNull().default(''),
  status: applicationStatus('status').notNull().default('pending'),
  reviewNote: text('review_note'),
  merchantId: text('merchant_id').references(() => merchants.id),
  createdAt: created(),
  reviewedAt: ts('reviewed_at'),
})
