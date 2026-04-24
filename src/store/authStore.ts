import { create } from 'zustand'
import { normalizeRoleId } from '@/constants/roles'

const STORAGE_KEY = 'staff_auth'

export type AuthUser = Record<string, unknown> & {
  name?: string
  email?: string
  roleID?: string
  roleId?: string
}

type SessionPayload = {
  accessToken: string
  user: AuthUser
}

const readStorage = (): SessionPayload | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as SessionPayload) : null
  } catch {
    return null
  }
}

const writeStorage = (value: SessionPayload) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
}

export const useAuthStore = create<{
  accessToken: string | null
  user: AuthUser | null
  isAuthenticated: boolean
  setSession: (p: SessionPayload) => void
  setAccessToken: (token: string | null) => void
  clearSession: () => void
  updateUser: (patch: Partial<AuthUser>) => void
  getRoleId: () => string | null
}>((set, get) => {
  const initial = readStorage()

  return {
    accessToken: initial?.accessToken ?? null,
    user: initial?.user ?? null,
    isAuthenticated: Boolean(initial?.accessToken),

    setSession: ({ accessToken, user }) => {
      const payload = { accessToken, user }
      writeStorage(payload)
      set({ accessToken, user, isAuthenticated: true })
    },

    setAccessToken: (token) => {
      const t = token && String(token).trim() ? String(token).trim() : null
      const user = get().user
      if (!t) {
        localStorage.removeItem(STORAGE_KEY)
        set({ accessToken: null, isAuthenticated: false })
        return
      }
      if (user) {
        writeStorage({ accessToken: t, user })
      } else {
        // keep storage shape consistent, but avoid writing invalid JSON structure
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ accessToken: t, user: {} }))
      }
      set({ accessToken: t, isAuthenticated: true })
    },

    clearSession: () => {
      localStorage.removeItem(STORAGE_KEY)
      set({ accessToken: null, user: null, isAuthenticated: false })
    },

    updateUser: (patch) => {
      const prev = get().user
      if (!prev) return
      const next = { ...prev, ...patch }
      const accessToken = get().accessToken
      if (!accessToken) return
      writeStorage({ accessToken, user: next })
      set({ user: next })
    },

    getRoleId: () => normalizeRoleId(get().user?.roleID ?? get().user?.roleId),
  }
})
