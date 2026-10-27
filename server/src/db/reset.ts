/* Drop everything and rebuild: migrations + demo seed. Development and tests only. */
import { config } from '../config'
import { sql } from './client'
import { runMigrations } from './migrate'
import { seed } from './seed'

export async function resetDatabase(opts: { withOrders?: boolean; log?: boolean } = {}) {
  if (config.NODE_ENV === 'production') throw new Error('Refusing to reset a production database')
  await sql.unsafe('drop schema if exists public cascade; drop schema if exists drizzle cascade; create schema public;')
  await runMigrations()
  await seed(opts)
}

const isMain = process.argv[1] && /reset\.(ts|js)$/.test(process.argv[1])
if (isMain) {
  resetDatabase().then(() => sql.end()).catch(async (e) => { console.error(e); await sql.end(); process.exit(1) })
}
