import { create } from 'zustand'

const STORAGE_KEY = 'staff_sidebar_collapsed'

const readCollapsed = (): boolean => {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export const useSidebarStore = create<{
  collapsed: boolean
  mobileOpen: boolean
  toggle: () => void
  openMobile: () => void
  closeMobile: () => void
  toggleMobile: () => void
}>((set, get) => ({
  collapsed: readCollapsed(),
  mobileOpen: false,
  toggle: () => {
    const next = !get().collapsed
    try {
      localStorage.setItem(STORAGE_KEY, next ? '1' : '0')
    } catch {
      /* ignore */
    }
    set({ collapsed: next })
  },
  openMobile: () => set({ mobileOpen: true }),
  closeMobile: () => set({ mobileOpen: false }),
  toggleMobile: () => set((s) => ({ mobileOpen: !s.mobileOpen })),
}))
