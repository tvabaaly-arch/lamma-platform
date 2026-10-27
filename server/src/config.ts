import { z } from 'zod'

const DEV_SECRET = 'lamma-development-secret-do-not-use-in-production'

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(8787),
  DATABASE_URL: z.string().default('postgres://lamma:lamma@localhost:5432/lamma_dev'),
  JWT_SECRET: z.string().min(32).default(DEV_SECRET),
  ACCESS_TOKEN_TTL_MIN: z.coerce.number().int().positive().default(30),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
  CORS_ORIGINS: z.string().default('http://localhost:5173,http://localhost:4173,https://tvabaaly-arch.github.io'),
  PUBLIC_API_URL: z.string().url().default('http://localhost:8787'),
  /** Where the bundled product photos are served from. Defaults to this API's /static/. */
  ASSET_BASE_URL: z.string().url().optional(),
  STATIC_DIR: z.string().default('../public'),
  UPLOAD_DIR: z.string().default('./uploads'),
  SMS_PROVIDER: z.enum(['console']).default('console'),
  OTP_DEV_CODE: z.string().regex(/^\d{4}$/).optional().or(z.literal('').transform(() => undefined)),
  PAYMENT_PROVIDER: z.enum(['demo']).default('demo'),
  UNPAID_ORDER_TTL_MIN: z.coerce.number().int().positive().default(30),
})

export type Config = z.infer<typeof schema>

export function loadConfig(env: Record<string, string | undefined> = process.env): Config {
  const parsed = schema.safeParse(env)
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
    throw new Error(`Invalid configuration — ${issues}`)
  }
  const c = parsed.data
  if (c.NODE_ENV === 'production') {
    if (c.JWT_SECRET === DEV_SECRET) throw new Error('JWT_SECRET must be set in production')
    if (c.OTP_DEV_CODE) throw new Error('OTP_DEV_CODE must not be set in production')
  }
  return c
}

export const config = loadConfig()
export const assetBase = () => (config.ASSET_BASE_URL ?? `${config.PUBLIC_API_URL}/static/`).replace(/\/?$/, '/')
