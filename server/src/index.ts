import { serve } from '@hono/node-server'
import { config } from './config'
import { createApp } from './app'
import { sql } from './db/client'
import { runMigrations } from './db/migrate'
import { refreshCatalog } from './services/catalog'
import { expireUnpaidOrders } from './services/orders'
import { bus, startEventListener } from './lib/events'

async function main() {
  if (process.env.MIGRATE_ON_START !== 'false') await runMigrations()
  await refreshCatalog()
  await startEventListener()

  // Keep this instance's catalog fresh when another instance changes it.
  let pending: NodeJS.Timeout | null = null
  bus.on('event', (e) => {
    if (e.type !== 'catalog.changed') return
    if (pending) clearTimeout(pending)
    pending = setTimeout(() => { pending = null; refreshCatalog().catch((err) => console.error('[catalog] refresh failed', err)) }, 250)
  })
  setInterval(() => { expireUnpaidOrders().catch((err) => console.error('[orders] expiry failed', err)) }, 60_000).unref()

  const app = createApp()
  const server = serve({ fetch: app.fetch, port: config.PORT }, (info) => {
    console.log(`LAMMA API listening on http://localhost:${info.port} (${config.NODE_ENV})`)
  })
  const shutdown = async () => {
    server.close()
    await sql.end({ timeout: 5 })
    process.exit(0)
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

main().catch(async (e) => {
  console.error(e)
  await sql.end().catch(() => {})
  process.exit(1)
})
