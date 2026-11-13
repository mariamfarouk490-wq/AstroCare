import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'

const src = (p) => fileURLToPath(new URL(`./src/${p}`, import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // three.js (~1 MB minified) lives in its own lazy chunk, the body map
  build: { chunkSizeWarningLimit: 1100 },
  resolve: {
    alias: {
      '@domain': src('domain'),
      '@application': src('application'),
      '@infrastructure': src('infrastructure'),
      '@state': src('state'),
      '@ui': src('ui'),
      '@data': src('data'),
      '@app': src('app'),
    },
  },
})
