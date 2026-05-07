


const trimEndSlash = (s: string) => String(s ?? '').trim().replace(/\/+$/, '')

const stripApiSuffix = (url: string) => url.replace(/\/api\/?$/i, '')

const normalizeOrigin = (raw: string): string => {
  if (!raw) return ''
  return trimEndSlash(stripApiSuffix(raw))
}

const getBackendOriginRaw = (): string => {
  const fromEnv =
    import.meta.env.VITE_BACKEND_ORIGIN?.trim() || import.meta.env.VITE_API_URL?.trim() || ''

  if (fromEnv) return fromEnv

  // DEV fallback: if staff app runs on localhost without env configured,
  // default to the backend dev port so Socket.IO + REST can connect.
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    const host = window.location.hostname
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://localhost:8080'
    }
  }

  return ''
}

/** Axios base URL: `/api` or `http://host:8080/api`. */
export const getApiBaseUrl = (): string => {
  const o = normalizeOrigin(getBackendOriginRaw())
  return o ? `${o}/api` : '/api'
}

 
export const getSocketUrl = (): string => {
  const sock = normalizeOrigin(import.meta.env.VITE_SOCKET_URL?.trim() || '')
  if (sock) return sock
  const be = normalizeOrigin(getBackendOriginRaw())
  if (be) return be
  if (typeof window !== 'undefined') return window.location.origin
  return ''
}
