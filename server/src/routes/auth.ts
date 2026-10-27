import { Hono } from 'hono'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db, schema } from '../db/client'
import { type AppEnv, v, rateLimit, requireAuth, userOf } from '../lib/http'
import { zPhone } from '../lib/schemas'
import { E } from '../lib/errors'
import * as auth from '../services/auth'

export const authRoutes = new Hono<AppEnv>()
  .post('/otp/request', rateLimit('otp-ip', 20, 3600e3), v('json', z.object({ phone: zPhone })), async (c) => {
    return c.json(await auth.requestOtp(c.req.valid('json').phone))
  })
  .post('/otp/verify', rateLimit('verify-ip', 30, 600e3),
    v('json', z.object({ phone: zPhone, code: z.string().regex(/^\d{4}$/), name: z.string().trim().min(2).max(60).optional() })),
    async (c) => {
      const { phone, code, name } = c.req.valid('json')
      return c.json(await auth.verifyOtp(phone, code, { name, userAgent: c.req.header('user-agent') }))
    })
  .post('/refresh', rateLimit('refresh-ip', 60, 600e3), v('json', z.object({ refreshToken: z.string().min(20) })), async (c) => {
    return c.json(await auth.refresh(c.req.valid('json').refreshToken, c.req.header('user-agent')))
  })
  .post('/logout', v('json', z.object({ refreshToken: z.string().min(20) })), async (c) => {
    await auth.logout(c.req.valid('json').refreshToken)
    return c.json({ ok: true })
  })

export const meRoutes = new Hono<AppEnv>()
  .use(requireAuth())
  .get('/', async (c) => {
    const [u] = await db.select().from(schema.users).where(eq(schema.users.id, userOf(c).sub))
    if (!u) throw E.unauthorized()
    return c.json({ user: auth.publicUser(u) })
  })
  .patch('/', v('json', z.object({
    name: z.string().trim().min(2).max(60).optional(),
    email: z.string().trim().email().max(120).nullable().optional(),
    lang: z.enum(['ar', 'en']).optional(),
  })), async (c) => {
    const [u] = await db.update(schema.users).set(c.req.valid('json')).where(eq(schema.users.id, userOf(c).sub)).returning()
    return c.json({ user: auth.publicUser(u) })
  })
