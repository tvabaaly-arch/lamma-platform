import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { fileURLToPath } from 'node:url'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { db, sql } from './client'

const here = path.dirname(fileURLToPath(import.meta.url))
// src/db/ when run with tsx, dist/ when bundled.
export const migrationsFolder = [path.resolve(here, '../../drizzle'), path.resolve(here, '../drizzle')].find((p) => existsSync(path.join(p, 'meta')))!

export async function runMigrations() {
  await migrate(db, { migrationsFolder })
}

const isMain = process.argv[1] && /migrate\.(ts|js)$/.test(process.argv[1])
if (isMain) {
  runMigrations().then(async () => { console.log('✓ migrations applied'); await sql.end() }).catch(async (e) => { console.error(e); await sql.end(); process.exit(1) })
}
