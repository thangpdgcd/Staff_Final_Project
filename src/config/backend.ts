/**
 * Chuẩn hóa Staff App ↔ Backend (REST `/api` + Socket.IO).
 *
 * VITE_BACKEND_ORIGIN — Gốc BE, ví dụ http://localhost:8080 (không /api).
 *   Để trống: axios dùng `/api`, Socket dùng `window.location.origin` (proxy Vite / nginx).
 *   Có giá trị: gọi thẳng BE (cần CORS + cookie trên BE).
 * VITE_API_URL — (tuỳ chọn) Cùng ý nghĩa gốc BE; dùng khi VITE_BACKEND_ORIGIN trống (thường build production).
 *
 * VITE_SOCKET_URL — (tuỳ chọn) Chỉ ghi đè URL cho Socket.IO (host/path base giống BE).
 *
 * Railway: ưu tiên đặt VITE_API_URL hoặc VITE_BACKEND_ORIGIN (gốc BE, không /api). Hoặc API_URL /
 * BACKEND_URL — vite.config map sang VITE_* khi build (xem importMetaDefineFromRailwayStyleEnv).
 */

const trimEndSlash = (s: string) => String(s ?? '').trim().replace(/\/+$/, '')

const stripApiSuffix = (url: string) => url.replace(/\/api\/?$/i, '')

function normalizeOrigin(raw: string): string {
  if (!raw) return ''
  return trimEndSlash(stripApiSuffix(raw))
}

function getBackendOriginRaw(): string {
  return (
    import.meta.env.VITE_BACKEND_ORIGIN?.trim() ||
    import.meta.env.VITE_API_URL?.trim() ||
    ''
  )
}

/** Base URL cho axios: `/api` hoặc `http://host:8080/api`. */
export function getApiBaseUrl(): string {
  const o = normalizeOrigin(getBackendOriginRaw())
  return o ? `${o}/api` : '/api'
}

/** Origin cho `io()` — ưu tiên VITE_SOCKET_URL, rồi gốc BE (VITE_BACKEND_ORIGIN / VITE_API_URL), rồi same-origin. */
export function getSocketUrl(): string {
  const sock = normalizeOrigin(import.meta.env.VITE_SOCKET_URL?.trim() || '')
  if (sock) return sock
  const be = normalizeOrigin(getBackendOriginRaw())
  if (be) return be
  if (typeof window !== 'undefined') return window.location.origin
  return ''
}
