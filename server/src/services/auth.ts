import { and, desc, eq, gt, isNull } from 'drizzle-orm'
import { db, schema } from '../db/client'
import { config } from '../config'
import { E } from '../lib/errors'
import { hmac, randomDigits, randomToken, safeEqual, sha256 } from '../lib/crypto'
import { signAccessToken } from '../lib/jwt'
import { localPhone } from '../lib/phone'
import { hit } from '../lib/rate-limit'
import { sms } from '../providers/sms'

const OTP_TTL_MS = 5 * 60e3
const OTP_MAX_ATTEMPTS = 5

type UserRow = typeof schema.users.$inferSelect

export const publicUser = (u: UserRow) => ({
  id: u.id, phone: localPhone(u.phone), name: u.name, email: u.email, role: u.role, merchantId: u.merchantId, lang: u.lang,
})

export async function requestOtp(phone: string) {
  hit(`otp:phone30s:${phone}`, 1, 30e3)
  hit(`otp:phone1h:${phone}`, 6, 3600e3)
  const code = config.OTP_DEV_CODE ?? randomDigits(4)
  await db.insert(schema.otpCodes).values({ phone, codeHash: hmac(`${phone}:${code}`), expiresAt: new Date(Date.now() + OTP_TTL_MS) })
  await sms.sendOtp(phone, code)
  return { sent: true, expiresIn: OTP_TTL_MS / 1000, devMode: !!config.OTP_DEV_CODE }
}

export async function verifyOtp(phone: string, code: string, profile: { name?: string; userAgent?: string }) {
  const [otp] = await db.select().from(schema.otpCodes)
    .where(and(eq(schema.otpCodes.phone, phone), isNull(schema.otpCodes.consumedAt), gt(schema.otpCodes.expiresAt, new Date())))
    .orderBy(desc(schema.otpCodes.createdAt)).limit(1)
  if (!otp) throw E.badRequest('otp_expired', 'انتهت صلاحية الرمز، اطلب رمزاً جديداً', 'The code has expired — request a new one')
  if (otp.attempts >= OTP_MAX_ATTEMPTS) throw E.badRequest('otp_locked', 'محاولات كثيرة، اطلب رمزاً جديداً', 'Too many attempts — request a new code')
  if (!safeEqual(otp.codeHash, hmac(`${phone}:${code}`))) {
    await db.update(schema.otpCodes).set({ attempts: otp.attempts + 1 }).where(eq(schema.otpCodes.id, otp.id))
    throw E.badRequest('otp_invalid', 'الرمز غير صحيح', 'Incorrect code', { attemptsLeft: OTP_MAX_ATTEMPTS - otp.attempts - 1 })
  }
  await db.update(schema.otpCodes).set({ consumedAt: new Date() }).where(eq(schema.otpCodes.id, otp.id))

  let [user] = await db.select().from(schema.users).where(eq(schema.users.phone, phone))
  const isNew = !user
  if (!user) [user] = await db.insert(schema.users).values({ phone, name: profile.name?.trim() || null }).returning()
  else if (!user.name && profile.name) [user] = await db.update(schema.users).set({ name: profile.name.trim() }).where(eq(schema.users.id, user.id)).returning()
  await db.update(schema.users).set({ lastLoginAt: new Date() }).where(eq(schema.users.id, user.id))
  return { ...(await issueTokens(user, profile.userAgent)), isNew }
}

export async function issueTokens(user: UserRow, userAgent?: string) {
  const refreshToken = randomToken(32)
  await db.insert(schema.refreshTokens).values({
    userId: user.id, tokenHash: sha256(refreshToken), userAgent: userAgent?.slice(0, 200) ?? null,
    expiresAt: new Date(Date.now() + config.REFRESH_TOKEN_TTL_DAYS * 86400e3),
  })
  const accessToken = await signAccessToken({ sub: user.id, role: user.role, mid: user.merchantId })
  return { accessToken, refreshToken, expiresIn: config.ACCESS_TOKEN_TTL_MIN * 60, user: publicUser(user) }
}

/** Rotate a refresh token. Re-using an already-rotated token revokes every session of that user. */
export async function refresh(token: string, userAgent?: string) {
  const [row] = await db.select().from(schema.refreshTokens).where(eq(schema.refreshTokens.tokenHash, sha256(token)))
  if (!row || row.expiresAt < new Date()) throw E.unauthorized()
  if (row.revokedAt) {
    await db.update(schema.refreshTokens).set({ revokedAt: new Date() }).where(and(eq(schema.refreshTokens.userId, row.userId), isNull(schema.refreshTokens.revokedAt)))
    throw E.unauthorized()
  }
  const revoked = await db.update(schema.refreshTokens).set({ revokedAt: new Date() })
    .where(and(eq(schema.refreshTokens.id, row.id), isNull(schema.refreshTokens.revokedAt))).returning({ id: schema.refreshTokens.id })
  if (!revoked.length) throw E.unauthorized()
  const [user] = await db.select().from(schema.users).where(eq(schema.users.id, row.userId))
  if (!user) throw E.unauthorized()
  return issueTokens(user, userAgent)
}

export async function logout(token: string) {
  await db.update(schema.refreshTokens).set({ revokedAt: new Date() }).where(eq(schema.refreshTokens.tokenHash, sha256(token)))
}
