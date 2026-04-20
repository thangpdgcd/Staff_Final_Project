import { useEffect, useRef } from 'react'
import { Bell } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { NotificationDropdown } from '@/components/notifications/NotificationDropdown'
import { useNotifications } from '@/hooks/useNotifications'

export const NotificationBell = () => {
  const { t } = useTranslation()
  const {
    items,
    unreadCount,
    dropdownOpen,
    setDropdownOpen,
    toast,
    setToast,
    markRead,
    markAllRead,
  } = useNotifications()

  const btnRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDropdownOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setDropdownOpen])

  return (
    <div className="relative">
      <motion.button
        ref={btnRef}
        type="button"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.96 }}
        onClick={() => setDropdownOpen(!dropdownOpen)}
        aria-label={t('notifications.ariaOpen')}
        className="relative rounded-xl border border-zinc-200/70 dark:border-zinc-800 p-2 text-zinc-700 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800/40 transition-colors"
      >
        <Bell size={18} />
        {unreadCount > 0 ? (
          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-black grid place-items-center shadow-sm">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        ) : null}
      </motion.button>

      <NotificationDropdown
        open={dropdownOpen}
        items={items}
        onClose={() => setDropdownOpen(false)}
        onMarkAllRead={() => {
          markAllRead()
        }}
        onItemClick={(n) => {
          markRead(n.id)
          setDropdownOpen(false)
        }}
      />

      {/* Toast popup */}
      <AnimatePresence>
        {toast ? (
          <motion.button
            type="button"
            onClick={() => {
              markRead(toast.id)
              setToast(null)
              setDropdownOpen(true)
            }}
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            className="fixed right-4 top-20 z-60 w-[360px] max-w-[calc(100vw-2rem)] rounded-2xl border border-zinc-200/70 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 backdrop-blur shadow-xl p-4 text-left"
          >
            <div className="text-xs font-black tracking-widest uppercase text-brand-600 dark:text-brand-400">
              {t('notifications.toastTitle')}
            </div>
            <div className="mt-1 text-sm font-semibold text-zinc-900 dark:text-white line-clamp-2">
              {toast.message}
            </div>
            <div className="mt-2 text-[11px] text-zinc-500 dark:text-zinc-400">
              {t('notifications.toastHint')}
            </div>
          </motion.button>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

