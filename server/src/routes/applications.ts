import { Hono } from 'hono'
import { z } from 'zod'
import { and, desc, eq } from 'drizzle-orm'
import { db, schema } from '../db/client'
import { type AppEnv, v, requireAuth, userOf, rateLimit } from '../lib/http'
import { zCategory, zCity, zPhone } from '../lib/schemas'
import { E } from '../lib/errors'
import { localPhone } from '../lib/phone'

/** Merchants apply to sell on LAMMA; an admin approves (creating the store) or rejects. */
export const applicationRoutes = new Hono<AppEnv>()
  .use(requireAuth())
  .post('/', rateLimit('apply', 5, 3600e3), v('json', z.object({
    storeNameAr: z.string().trim().min(2).max(60), storeNameEn: z.string().trim().min(2).max(60),
    categories: z.array(zCategory).min(1).max(6), cities: z.array(zCity).min(1),
    contactName: z.string().trim().min(2).max(60), phone: zPhone, email: z.string().email().max(120).optional(),
    crNumber: z.string().trim().regex(/^\d{10}$/, 'Commercial registration is 10 digits').optional(),
    about: z.string().trim().max(1000).default(''),
  })), async (c) => {
    const userId = userOf(c).sub
    const [pending] = await db.select({ id: schema.merchantApplications.id }).from(schema.merchantApplications)
      .where(and(eq(schema.merchantApplications.userId, userId), eq(schema.merchantApplications.status, 'pending')))
    if (pending) throw E.conflict('application_pending', 'لديك طلب قيد المراجعة', 'You already have an application under review')
    const [a] = await db.insert(schema.merchantApplications).values({ ...c.req.valid('json'), userId }).returning()
    return c.json({ application: { ...a, phone: localPhone(a.phone) } }, 201)
  })
  .get('/mine', async (c) => {
    const rows = await db.select().from(schema.merchantApplications).where(eq(schema.merchantApplications.userId, userOf(c).sub)).orderBy(desc(schema.merchantApplications.createdAt))
    return c.json({ items: rows.map((a) => ({ ...a, phone: localPhone(a.phone) })) })
  })
