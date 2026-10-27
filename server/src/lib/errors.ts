import type { Context } from 'hono'
import type { ClientErrorStatusCode, ServerErrorStatusCode } from 'hono/utils/http-status'
type ContentfulStatusCode = ClientErrorStatusCode | ServerErrorStatusCode
import { ZodError } from 'zod'

/** Error with a stable machine-readable code. Messages are bilingual so apps can show them directly. */
export class ApiError extends Error {
  constructor(
    public status: ContentfulStatusCode,
    public code: string,
    public messageAr: string,
    public messageEn: string,
    public details?: unknown,
  ) {
    super(messageEn)
  }
}

export const E = {
  badRequest: (code: string, ar: string, en: string, details?: unknown) => new ApiError(400, code, ar, en, details),
  unauthorized: () => new ApiError(401, 'unauthorized', 'يلزم تسجيل الدخول', 'Sign-in required'),
  forbidden: () => new ApiError(403, 'forbidden', 'ليس لديك صلاحية لهذا الإجراء', 'You do not have permission for this action'),
  notFound: (what = 'resource') => new ApiError(404, 'not_found', 'غير موجود', `${what} not found`),
  conflict: (code: string, ar: string, en: string, details?: unknown) => new ApiError(409, code, ar, en, details),
  tooMany: (retryAfterSec: number) => new ApiError(429, 'rate_limited', 'محاولات كثيرة، حاول بعد قليل', 'Too many attempts, try again shortly', { retryAfterSec }),
}

export function errorBody(e: ApiError) {
  return { error: { code: e.code, message: e.messageEn, messageAr: e.messageAr, ...(e.details !== undefined ? { details: e.details } : {}) } }
}

export function handleError(err: Error, c: Context) {
  if (err instanceof ApiError) {
    if (err.status === 429) c.header('Retry-After', String((err.details as { retryAfterSec: number }).retryAfterSec))
    return c.json(errorBody(err), err.status)
  }
  if (err instanceof ZodError) {
    return c.json(errorBody(validationError(err)), 400)
  }
  if ((err as { status?: number }).status === 404) return c.json(errorBody(E.notFound()), 404)
  console.error('[unhandled]', err)
  return c.json({ error: { code: 'internal', message: 'Something went wrong', messageAr: 'حدث خطأ غير متوقع' } }, 500)
}

export function validationError(err: ZodError) {
  const fields = err.issues.map((i) => ({ path: i.path.join('.'), message: i.message }))
  return E.badRequest('validation_error', 'بعض البيانات غير صحيحة', 'Some fields are invalid', fields)
}
