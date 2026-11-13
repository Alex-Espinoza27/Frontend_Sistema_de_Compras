import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'

// 05C hardening (pedido explícitamente por el usuario): base/outDir
// configurables + proxy de /api, /sanctum, /storage, /up hacia un backend
// remoto — necesario para correr `npm run dev` contra Laragon u otro host
// sin problemas de CORS/cookie-domain.
//
// Ninguna de las variables nuevas (VITE_BASE_PATH, VITE_OUT_DIR,
// VITE_PROXY_TARGET) está definida hoy en .env/.env.example, así que para el
// entorno Docker actual esto es un no-op: `base` sigue siendo "/", `outDir`
// sigue siendo "dist" y no hay proxy. Solo se activan si se definen
// explícitamente (ej. en un .env de Laragon o de build de producción).
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const proxyTarget = env.VITE_PROXY_TARGET
  const origenBackend = proxyTarget ? new URL(proxyTarget).origin : ''

  const rutaProxy = () => ({
    target: proxyTarget,
    changeOrigin: true,
    secure: proxyTarget?.startsWith('https') ?? false,
    headers: { Origin: origenBackend, Referer: `${origenBackend}/` },
    cookieDomainRewrite: 'localhost',
  })

  return {
    base: env.VITE_BASE_PATH || '/',
    plugins: [vue(), vuetify({ autoImport: true })],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    build: {
      outDir: env.VITE_OUT_DIR || 'dist',
      emptyOutDir: !env.VITE_OUT_DIR,
    },
    server: {
      host: '0.0.0.0',
      port: 5173,
      strictPort: true,
      proxy: proxyTarget
        ? {
            '/api': rutaProxy(),
            '/sanctum': rutaProxy(),
            '/storage': rutaProxy(),
            '/up': rutaProxy(),
          }
        : undefined,
    },
  }
})
