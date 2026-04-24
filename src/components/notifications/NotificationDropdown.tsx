import { AnimatePresence, motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { EmptyState } from '@/components/ui/EmptyState'
import { NotificationItem } from '@/components/notifications/NotificationItem'
import type { AppNotification } from '@/hooks/useNotifications'

export const NotificationDropdown = ({
  open,
  items,
  onItemClick,
  onClose,
  onMarkAllRead,
}: {
  open: boolean
  items: AppNotification[]
  onItemClick: (n: AppNotification) => void
  onClose: () => void
  onMarkAllRead: () => void
}) => {
  const { t } = useTranslation()
  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label={t('notifications.ariaClose')}
            className="fixed inset-0 z-40"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className="absolute right-0 top-12 z-50 w-[360px] max-w-[calc(100vw-2rem)] rounded-3xl border border-zinc-200/70 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 backdrop-blur shadow-xl overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-zinc-200/60 dark:border-zinc-800 flex items-center justify-between">
              <div className="text-sm font-black tracking-tight">{t('notifications.title')}</div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onMarkAllRead}
                  className="text-xs font-bold px-2.5 py-1.5 rounded-xl border border-zinc-200/70 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
                >
                  {t('notifications.markAllRead')}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-xs font-bold px-2.5 py-1.5 rounded-xl border border-zinc-200/70 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
                >
                  {t('common.close')}
                </button>
              </div>
            </div>

            <div className="max-h-[420px] overflow-y-auto p-3 space-y-2">
              {items.length === 0 ? (
                <EmptyState
                  title={t('notifications.emptyTitle')}
                  description={t('notifications.emptyDesc')}
                  className="border-0 bg-transparent"
                />
              ) : (
                items.slice(0, 25).map((n) => (
                  <NotificationItem key={String(n.id)} n={n} onClick={() => onItemClick(n)} />
                ))
              )}
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  )
}

