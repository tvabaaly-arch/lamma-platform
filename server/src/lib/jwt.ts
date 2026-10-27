import { SignJWT, jwtVerify } from 'jose'
import { config } from '../config'

export type Role = 'customer' | 'merchant' | 'admin'
export type Claims = { sub: string; role: Role; mid?: string | null }

const key = new TextEncoder().encode(config.JWT_SECRET)
const ISSUER = 'lamma-api'

export async function signAccessToken(c: Claims) {
  return new SignJWT({ role: c.role, mid: c.mid ?? null })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(c.sub)
    .setIssuer(ISSUER)
    .setIssuedAt()
    .setExpirationTime(`${config.ACCESS_TOKEN_TTL_MIN}m`)
    .sign(key)
}

export async function verifyAccessToken(token: string): Promise<Claims | null> {
  try {
    const { payload } = await jwtVerify(token, key, { issuer: ISSUER, algorithms: ['HS256'] })
    return { sub: payload.sub!, role: payload.role as Role, mid: (payload.mid as string | null) ?? null }
  } catch {
    return null
  }
}
