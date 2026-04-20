import axios from 'axios'
import { getApiBaseUrl } from '@/config/backend'

export const httpClient = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

const STORAGE_KEY = 'staff_auth'

type StoredSession = { accessToken?: string | null; user?: unknown } | null

const readStoredSession = (): StoredSession => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as StoredSession) : null
  } catch {
    return null
  }
}

const readStoredToken = (): string | null => {
  const t = readStoredSession()?.accessToken
  const s = t != null ? String(t).trim() : ''
  return s ? s : null
}

const writeStoredToken = (token: string | null) => {
  const current = readStoredSession()
  if (!token) {
    localStorage.removeItem(STORAGE_KEY)
    return
  }
  const user = current && typeof current === 'object' ? (current as any).user : undefined
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ accessToken: token, user: user ?? {} }))
}

export const setAuthToken = (token: string | null) => {
  if (token) httpClient.defaults.headers.common.Authorization = `Bearer ${token}`
  else delete httpClient.defaults.headers.common.Authorization
}

// Ensure Authorization is always attached (even after reload / HMR)
httpClient.interceptors.request.use((config) => {
  const existing = (config.headers as any)?.Authorization || (config.headers as any)?.authorization
  if (existing) return config
  const token = readStoredToken()
  if (!token) return config
  config.headers = config.headers || {}
  ;(config.headers as any).Authorization = `Bearer ${token}`
  return config
})

let isRefreshing = false
let refreshQueue: Array<(token: string | null) => void> = []

const subscribeRefresh = (cb: (token: string | null) => void) => {
  refreshQueue.push(cb)
}

const flushRefreshQueue = (token: string | null) => {
  refreshQueue.forEach((cb) => cb(token))
  refreshQueue = []
}

const forceLogout = () => {
  localStorage.removeItem(STORAGE_KEY)
  window.location.href = '/login'
}

const refreshAccessToken = async (): Promise<string> => {
  const base = String(httpClient.defaults.baseURL || '').replace(/\/+$/, '')
  const hasApi = /\/api$/i.test(base)
  const candidates = hasApi
    ? [`${base}/auth/refresh`, `${base}/refresh-token`]
    : [`${base}/api/auth/refresh`, `${base}/api/refresh-token`, `${base}/auth/refresh`]

  let lastErr: unknown
  for (const url of candidates) {
    try {
      const res = await axios.post(url, {}, { withCredentials: true, timeout: 15000, headers: { 'Content-Type': 'application/json' } })
      const payload = res.data as any
      const token =
        payload?.accessToken ||
        payload?.token ||
        payload?.data?.accessToken ||
        payload?.data?.token ||
        payload?.data?.data?.accessToken ||
        payload?.data?.data?.token
      if (!token) throw new Error('Refresh response missing token')
      return String(token)
    } catch (e) {
      lastErr = e
    }
  }
  throw lastErr
}

httpClient.interceptors.response.use(
  (r) => r,
  async (e) => {
    const status = e?.response?.status
    const originalRequest = e?.config
    const url = typeof originalRequest?.url === 'string' ? originalRequest.url : ''
    const isRefresh = url.includes('/auth/refresh') || url.includes('/refresh-token')
    const isAuthEndpoint = url.includes('/login') || url.includes('/register')

    // Do not attempt refresh on login/register failures; surface the 401 to the UI.
    if (status === 401 && originalRequest && !originalRequest._retry && !isRefresh && !isAuthEndpoint) {
      originalRequest._retry = true

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          subscribeRefresh((token) => {
            if (!token) return reject(e)
            originalRequest.headers = originalRequest.headers || {}
            originalRequest.headers.Authorization = `Bearer ${token}`
            resolve(httpClient(originalRequest))
          })
        })
      }

      isRefreshing = true
      try {
        const newToken = await refreshAccessToken()
        const trimmed = String(newToken).trim()
        writeStoredToken(trimmed)
        setAuthToken(trimmed)
        flushRefreshQueue(newToken)
        originalRequest.headers = originalRequest.headers || {}
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return httpClient(originalRequest)
      } catch (err) {
        flushRefreshQueue(null)
        forceLogout()
        return Promise.reject(err)
      } finally {
        isRefreshing = false
      }
    }

    if (status === 401 && isRefresh) {
      forceLogout()
    }
    return Promise.reject(e)
  },
)
