import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto'
import { config } from '../config'

export const sha256 = (s: string) => createHash('sha256').update(s).digest('hex')
export const hmac = (s: string) => createHmac('sha256', config.JWT_SECRET).update(s).digest('hex')
export const randomToken = (bytes = 32) => randomBytes(bytes).toString('base64url')
export const randomDigits = (n: number) => Array.from({ length: n }, () => randomInt(10)).join('')
export function safeEqual(a: string, b: string) {
  const x = Buffer.from(a), y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}
