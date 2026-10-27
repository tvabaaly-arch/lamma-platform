import { createMiddleware } from 'hono/factory'
import { zValidator } from '@hono/zod-validator'
import type { ValidationTargets } from 'hono'
import type { ZodSchema } from 'zod'
import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { E, validationError } from './errors'
import { verifyAccessToken, type Claims, type Role } from './jwt'
import { hit } from './rate-limit'

export type AppEnv = { Variables: { user?: Claims; merchantId?: string } }

/** Reads `Authorization: Bearer …` (or `?access_token=` for EventSource streams). */
export const readAuth = createMiddleware<AppEnv>(async (c, next) => {
  const h = c.req.header('authorization')
  const token = h?.startsWith('Bearer ') ? h.slice(7) : c.req.query('access_token')
  if (token) {
    const claims = await verifyAccessToken(token)
    if (claims) c.set('user', claims)
  }
  await next()
})

export const requireAuth = (...roles: Role[]) =>
  createMiddleware<AppEnv>(async (c, next) => {
    const u = c.get('user')
    if (!u) throw E.unauthorized()
    if (roles.length && !roles.includes(u.role)) throw E.forbidden()
    await next()
  })

/**
 * Merchant routes: merchants act on their own store; admins may act on any store
 * by passing `X-Merchant-Id` (used by the dashboard's store switcher).
 */
export const requireMerchant = createMiddleware<AppEnv>(async (c, next) => {
  const u = c.get('user')
  if (!u) throw E.unauthorized()
  let mid: string | undefined
  if (u.role === 'merchant' && u.mid) mid = u.mid
  else if (u.role === 'admin') mid = c.req.header('x-merchant-id') ?? c.req.query('merchantId')
  if (!mid) throw u.role === 'admin' ? E.badRequest('merchant_required', 'حدد المتجر', 'Pass X-Merchant-Id to act as a store') : E.forbidden()
  c.set('merchantId', mid)
  await next()
})

export const userOf = (c: { get: (k: 'user') => Claims | undefined }) => {
  const u = c.get('user')
  if (!u) throw E.unauthorized()
  return u
}

/** zod validation that answers with the API's standard 400 body. */
export const v = <T extends ZodSchema, K extends keyof ValidationTargets>(target: K, schema: T) =>
  zValidator(target, schema, (r) => { if (!r.success) throw validationError(r.error) })

export const clientIp = (c: { req: { header: (k: string) => string | undefined } }) =>
  c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || c.req.header('x-real-ip') || 'local'

export const rateLimit = (name: string, limit: number, windowMs: number) =>
  createMiddleware<AppEnv>(async (c, next) => { hit(`${name}:${clientIp(c)}`, limit, windowMs); await next() })

const MIME: Record<string, string> = {
  '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json',
}

/** Serve files from a directory without allowing path traversal. */
export function serveDir(root: string, prefix: string, maxAge = 86400) {
  const base = path.resolve(root)
  return createMiddleware(async (c, next) => {
    let rel: string
    try { rel = decodeURIComponent(c.req.path.slice(prefix.length)) } catch { return next() }
    const file = path.resolve(base, '.' + path.sep + rel)
    const type = MIME[path.extname(file).toLowerCase()]
    if (!file.startsWith(base + path.sep) || !type) return next()
    try {
      const s = await stat(file)
      if (!s.isFile()) return next()
      const body = await readFile(file)
      return c.body(body, 200, { 'Content-Type': type, 'Cache-Control': `public, max-age=${maxAge}`, 'Access-Control-Allow-Origin': '*' })
    } catch {
      return next()
    }
  })
}
