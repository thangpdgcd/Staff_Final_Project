import { create } from 'zustand'

export type ToastVariant = 'success' | 'error' | 'info' | 'warning'

export type AppToast = {
  id: string
  title?: string
  message: string
  variant: ToastVariant
  createdAt: number
  durationMs: number
}

const uid = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`

export const useToastStore = create<{
  items: AppToast[]
  push: (
    t: Omit<AppToast, 'id' | 'createdAt' | 'durationMs'> & {
      id?: string
      createdAt?: number
      durationMs?: number
    },
  ) => string
  dismiss: (id: string) => void
  clear: () => void
}>((set, get) => ({
  items: [],
  push: (t) => {
    const id = t.id ?? uid()
    const createdAt = t.createdAt ?? Date.now()
    const next: AppToast = {
      id,
      createdAt,
      title: t.title,
      message: t.message,
      variant: t.variant ?? 'info',
      durationMs: Math.max(1200, Math.min(10000, Math.trunc(Number(t.durationMs ?? 3500)))),
    }
    set((s) => ({ items: [next, ...s.items].slice(0, 4) }))
    // Auto-dismiss
    window.setTimeout(() => {
      const cur = get().items
      if (cur.some((x) => x.id === id)) get().dismiss(id)
    }, next.durationMs)
    return id
  },
  dismiss: (id) => set((s) => ({ items: s.items.filter((x) => x.id !== id) })),
  clear: () => set({ items: [] }),
}))

export const toast = {
  success: (message: string, opts: { title?: string; durationMs?: number } = {}) =>
    useToastStore.getState().push({ variant: 'success', message, ...opts }),
  error: (message: string, opts: { title?: string; durationMs?: number } = {}) =>
    useToastStore.getState().push({ variant: 'error', message, ...opts }),
  info: (message: string, opts: { title?: string; durationMs?: number } = {}) =>
    useToastStore.getState().push({ variant: 'info', message, ...opts }),
  warning: (message: string, opts: { title?: string; durationMs?: number } = {}) =>
    useToastStore.getState().push({ variant: 'warning', message, ...opts }),
}

