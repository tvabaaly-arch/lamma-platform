import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { config } from '../config'
import { randomToken } from '../lib/crypto'

/** File storage for uploaded images. Local disk for now; swap for S3 / R2 by implementing `put`. */
export interface Storage {
  put(folder: string, ext: string, data: Uint8Array): Promise<{ key: string; url: string }>
}

export const uploadRoot = path.resolve(config.UPLOAD_DIR)

const local: Storage = {
  async put(folder, ext, data) {
    const key = `${folder}/${new Date().toISOString().slice(0, 7)}/${randomToken(12)}.${ext}`
    const file = path.join(uploadRoot, key)
    await mkdir(path.dirname(file), { recursive: true })
    await writeFile(file, data)
    return { key, url: `${config.PUBLIC_API_URL}/uploads/${key}` }
  },
}

export const storage: Storage = local

/** Detect image type from magic bytes (never trust the client's content-type). */
export function sniffImage(b: Uint8Array): 'jpg' | 'png' | 'webp' | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpg'
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'png'
  if (String.fromCharCode(...b.slice(0, 4)) === 'RIFF' && String.fromCharCode(...b.slice(8, 12)) === 'WEBP') return 'webp'
  return null
}
