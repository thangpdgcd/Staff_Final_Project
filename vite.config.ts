import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import type { Socket } from 'net'

const backendProxyTarget = (env: Record<string, string>) => {
  const raw = env.VITE_BACKEND_ORIGIN?.trim()
  if (!raw) return 'http://localhost:8080'
  return raw.replace(/\/+$/, '').replace(/\/api\/?$/i, '')
}

/**
 * Railway / hosting thường đặt `API_URL` hoặc `BACKEND_URL` (không có tiền tố VITE_).
 * Vite chỉ đưa `VITE_*` vào `import.meta.env` → map thủ công vào đúng tên app đang đọc.
 */
function importMetaDefineFromRailwayStyleEnv(env: Record<string, string>): Record<string, string> {
  const define: Record<string, string> = {}
  const viteBackend = env.VITE_BACKEND_ORIGIN?.trim()
  const viteApi = env.VITE_API_URL?.trim()
  const fallbackBackend = env.BACKEND_URL?.trim()
  const fallbackApi = env.API_URL?.trim() || env.PUBLIC_API_URL?.trim()

  if (!viteBackend && fallbackBackend) {
    define['import.meta.env.VITE_BACKEND_ORIGIN'] = JSON.stringify(fallbackBackend)
  }
  if (!viteApi && fallbackApi) {
    define['import.meta.env.VITE_API_URL'] = JSON.stringify(fallbackApi)
  }
  return define
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const target = backendProxyTarget(env)
  const importMetaDefine = importMetaDefineFromRailwayStyleEnv(env)

  return {
    define: importMetaDefine,
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
      dedupe: ['react', 'react-dom'],
    },
    server: {
      port: 5175,
      strictPort: true,
      proxy: {
        '/api': {
          target,
          changeOrigin: true,
        },
        '/socket.io': {
          target,
          ws: true,
          changeOrigin: true,
          configure: (proxy) => {
            proxy.on('error', (err: Error & { code?: string }) => {
              if (err.code === 'ECONNRESET' || err.code === 'ECONNABORTED') {
                return
              }
              console.log('proxy error', err)
            })
            proxy.on('proxyReqWs', (_proxyReq, _req, socket: Socket) => {
              socket.on('error', (err: Error & { code?: string }) => {
                if (err.code === 'ECONNRESET' || err.code === 'ECONNABORTED') return
                console.error('WebSocket error:', err)
              })
            })
          },
        },
      },
    },
  }
})
