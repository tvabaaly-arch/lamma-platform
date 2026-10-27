import { Hono } from 'hono'
import { type AppEnv, requireAuth, rateLimit } from '../lib/http'
import { E } from '../lib/errors'
import { storage, sniffImage } from '../providers/storage'

const MAX_BYTES = 5 * 1024 * 1024

/** Product photo upload (merchants and admins). Send multipart/form-data with a `file` field. */
export const uploadRoutes = new Hono<AppEnv>()
  .use(requireAuth('merchant', 'admin'))
  .post('/', rateLimit('upload', 60, 3600e3), async (c) => {
    const len = Number(c.req.header('content-length') ?? 0)
    if (len > MAX_BYTES + 64 * 1024) throw E.badRequest('file_too_large', 'الحد الأقصى ٥ ميجابايت', 'Maximum size is 5 MB')
    const form = await c.req.parseBody()
    const file = form.file
    if (!(file instanceof File)) throw E.badRequest('file_required', 'أرفق صورة', 'Attach an image in the "file" field')
    if (file.size > MAX_BYTES) throw E.badRequest('file_too_large', 'الحد الأقصى ٥ ميجابايت', 'Maximum size is 5 MB')
    const bytes = new Uint8Array(await file.arrayBuffer())
    const ext = sniffImage(bytes)
    if (!ext) throw E.badRequest('unsupported_type', 'الصيغ المدعومة: JPG و PNG و WebP', 'Supported formats: JPG, PNG, WebP')
    const saved = await storage.put('products', ext, bytes)
    return c.json({ url: saved.url, key: saved.key }, 201)
  })
