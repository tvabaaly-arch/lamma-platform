// Bundle the API (and the shared web-app modules it imports) into dist/index.js.
import { build } from 'esbuild'

await build({
  entryPoints: ['src/index.ts', 'src/db/migrate.ts', 'src/db/seed.ts'],
  outdir: 'dist',
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  packages: 'external',
  sourcemap: true,
  outExtension: { '.js': '.js' },
  entryNames: '[name]',
  banner: { js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);" },
})
console.log('✓ built dist/')
