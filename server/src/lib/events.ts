import { EventEmitter } from 'node:events'
import { sql } from '../db/client'

/**
 * Realtime events. Published through Postgres NOTIFY so every API instance receives them,
 * then fanned out locally to Server-Sent-Event subscribers.
 */
export type LammaEvent =
  | { type: 'order.status'; orderId: string; merchantId: string; status: string; at: string }
  | { type: 'order.paid'; orderId: string; merchantIds: string[]; at: string }
  | { type: 'order.cancelled'; orderId: string; merchantIds: string[]; at: string }
  | { type: 'catalog.changed'; at: string }

const CHANNEL = 'lamma_events'
export const bus = new EventEmitter()
bus.setMaxListeners(0)

let listening: Promise<unknown> | null = null
export function startEventListener() {
  listening ??= sql.listen(CHANNEL, (payload) => {
    try { bus.emit('event', JSON.parse(payload) as LammaEvent) } catch { /* ignore malformed */ }
  })
  return listening
}

export async function publish(e: LammaEvent) {
  await sql.notify(CHANNEL, JSON.stringify(e))
}
