import { z } from 'zod'
import { CATEGORIES, CITIES, OCCASIONS, RECIPIENTS, COLLECTIONS } from '../../../src/data/catalog'
import { AGE_GROUPS, INTERESTS, RELATIONSHIPS } from '../../../src/lib/ai'
import { SLOTS, PAYMENT_METHODS } from '../../../src/lib/model'
import { normalizeSaudiPhone } from './phone'

const ids = <T extends { id: string }>(xs: readonly T[]) => xs.map((x) => x.id) as [string, ...string[]]
// Category ids are fixed in code (the storefront and gift engine rely on them).
export const CATEGORY_IDS = ['flowers', 'cakes', 'chocolate', 'balloons', 'decoration', 'gifts', 'desserts', 'custom', 'kids', 'beauty', 'perfume', 'men', 'lifestyle'] as const
export const zCategory = z.enum(CATEGORY_IDS)
export const zCity = z.enum(ids(CITIES))
export const zOccasion = z.enum(ids(OCCASIONS))
export const zRecipient = z.enum(ids(RECIPIENTS))
export const zAge = z.enum(ids(AGE_GROUPS))
export const zInterest = z.enum(ids(INTERESTS))
export const zRelationship = z.enum(ids(RELATIONSHIPS))
export const zCollection = z.enum(ids(COLLECTIONS))
export const zSlot = z.enum(SLOTS.map((s) => s.id) as [string, ...string[]])
export const zPaymentMethod = z.enum(PAYMENT_METHODS)
export const zL = z.object({ ar: z.string().trim().min(1).max(2000), en: z.string().trim().min(1).max(2000) })
export const zDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD')
export const zPhone = z.string().transform((s, ctx) => {
  const p = normalizeSaudiPhone(s)
  if (!p) { ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Saudi mobile number starting with 05' }); return z.NEVER }
  return p
})
export const zVariant = z.record(z.string().max(40), z.string().max(40)).default({})

export const zCartItem = z.object({
  productId: z.string().min(1).max(64),
  variant: zVariant,
  qty: z.number().int().min(1).max(20),
  note: z.string().trim().max(200).optional(),
  bundle: z.string().max(40).optional(),
})

export const zBrief = z.object({
  text: z.string().max(1000).default(''),
  occasion: zOccasion,
  recipient: zRecipient,
  budget: z.number().min(50).max(50000),
  city: zCity,
  date: zDate.optional(),
  style: z.enum(['', 'luxe', 'simple', 'fun']).optional(),
  age: zAge.optional(),
  interests: z.array(zInterest).max(8).optional(),
  relationship: zRelationship.optional(),
})

export { CATEGORIES }
