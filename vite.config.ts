import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import { existsSync } from 'node:fs'

export default defineConfig({
  plugins: [react()],
  // Push só liga com o Firebase configurado: sem google-services.json o
  // Android fecha o app ao registrar o aparelho.
  define: { __PUSH_PRONTO__: JSON.stringify(existsSync('android/app/google-services.json')) },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@domain': fileURLToPath(new URL('./src/domain', import.meta.url)),
      '@data': fileURLToPath(new URL('./src/data', import.meta.url)),
      '@ui': fileURLToPath(new URL('./src/ui', import.meta.url)),
      '@app': fileURLToPath(new URL('./src/app', import.meta.url)),
    },
  },
  server: { host: true, port: 5173, watch: { usePolling: true, interval: 300 } },
  build: { outDir: 'dist', sourcemap: false, target: 'es2022' },
})
