import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// `npm run build` -> regular optimized build (dist/)
// `npm run build:single` -> one self-contained HTML file (dist-single/) for static preview hosting
declare const process: { env: Record<string, string | undefined> }

// BASE_PATH (e.g. /lamma-platform/ on GitHub Pages) overrides the default relative base.
export default defineConfig(({ mode }) => ({
  base: process.env.BASE_PATH || './',
  plugins: [react(), ...(mode === 'single' ? [viteSingleFile()] : [])],
  build: { outDir: mode === 'single' ? 'dist-single' : 'dist', chunkSizeWarningLimit: 2000 },
}))
