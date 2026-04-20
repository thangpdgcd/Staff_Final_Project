import { create } from 'zustand'

const STORAGE_KEY = 'staff_theme'

const readStorage = (): string | null => {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

const applyThemeClass = (dark: boolean) => {
  const root = document.documentElement
  if (dark) root.classList.add('dark')
  else root.classList.remove('dark')
}

export const useThemeStore = create<{
  dark: boolean
  toggle: () => void
  setDark: (value: boolean) => void
}>((set, get) => {
  const initial = readStorage()
  const dark = initial ? initial === 'dark' : false
  if (typeof document !== 'undefined') applyThemeClass(dark)

  return {
    dark,
    toggle: () => {
      const next = !get().dark
      applyThemeClass(next)
      localStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light')
      set({ dark: next })
    },
    setDark: (value) => {
      applyThemeClass(Boolean(value))
      localStorage.setItem(STORAGE_KEY, value ? 'dark' : 'light')
      set({ dark: Boolean(value) })
    },
  }
})
