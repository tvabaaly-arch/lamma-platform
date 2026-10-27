import { E } from './errors'

/** Small in-memory fixed-window limiter. Good for a single instance; swap for Redis when scaling out. */
const buckets = new Map<string, { count: number; resetAt: number }>()

export function hit(key: string, limit: number, windowMs: number) {
  const now = Date.now()
  const b = buckets.get(key)
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return
  }
  b.count++
  if (b.count > limit) throw E.tooMany(Math.ceil((b.resetAt - now) / 1000))
}

export function resetRateLimits() { buckets.clear() }

setInterval(() => {
  const now = Date.now()
  for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k)
}, 60_000).unref()
