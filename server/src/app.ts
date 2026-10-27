import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'
import { logger } from 'hono/logger'
import { bodyLimit } from 'hono/body-limit'
import path from 'node:path'
import { config } from './config'
import { E, errorBody, handleError } from './lib/errors'
import { type AppEnv, readAuth, serveDir } from './lib/http'
import { sql } from './db/client'
import { uploadRoot } from './providers/storage'
import { authRoutes, meRoutes } from './routes/auth'
import { accountRoutes } from './routes/account'
import { catalogRoutes } from './routes/catalog'
import { aiRoutes } from './routes/ai'
import { orderRoutes } from './routes/orders'
import { merchantRoutes } from './routes/merchant'
import { adminRoutes } from './routes/admin'
import { applicationRoutes } from './routes/applications'
import { uploadRoutes } from './routes/uploads'
import { payments } from './providers/payments'
import { sms } from './providers/sms'

export function createApp() {
  const origins = config.CORS_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean)
  const app = new Hono<AppEnv>()

  if (config.NODE_ENV === 'development') app.use(logger())
  app.use(secureHeaders({ crossOriginResourcePolicy: 'cross-origin' }))
  app.use('/api/*', cors({
    origin: (o) => (origins.includes(o) ? o : null),
    allowHeaders: ['Content-Type', 'Authorization', 'X-Merchant-Id', 'If-None-Match'],
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    exposeHeaders: ['ETag', 'Retry-After'],
    maxAge: 600,
  }))
  app.use('/api/*', bodyLimit({ maxSize: 6 * 1024 * 1024, onError: () => { throw E.badRequest('body_too_large', 'حجم الطلب كبير', 'Request body too large') } }))
  app.use('/api/*', readAuth)

  app.get('/health', async (c) => {
    await sql`select 1`
    return c.json({ ok: true, env: config.NODE_ENV, providers: { payments: payments.name, sms: sms.name, ai: 'rules-v1' } })
  })

  const api = new Hono<AppEnv>()
    .route('/', catalogRoutes)
    .route('/', orderRoutes)
    .route('/auth', authRoutes)
    .route('/me', meRoutes)
    .route('/me', accountRoutes)
    .route('/ai', aiRoutes)
    .route('/merchant', merchantRoutes)
    .route('/admin', adminRoutes)
    .route('/merchant-applications', applicationRoutes)
    .route('/uploads', uploadRoutes)
  app.route('/api/v1', api)

  // Product photography bundled with the web app, and merchant uploads.
  app.use('/static/*', serveDir(path.resolve(config.STATIC_DIR), '/static/', 7 * 86400))
  app.use('/uploads/*', serveDir(uploadRoot, '/uploads/', 30 * 86400))

  app.notFound((c) => c.json(errorBody(E.notFound('route')), 404))
  app.onError(handleError)
  return app
}

export type App = ReturnType<typeof createApp>
