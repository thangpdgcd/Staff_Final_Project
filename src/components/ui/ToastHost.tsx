import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useToastStore } from '@/store/toastStore'
import { cn } from '@/utils/cn'

const palette = (variant: string) => {
  switch (variant) {
    case 'success':
      return {
        badge: 'bg-emerald-600 text-white',
        border: 'border-emerald-200/70 dark:border-emerald-900/40',
        title: 'text-emerald-700 dark:text-emerald-300',
      }
    case 'error':
      return {
        badge: 'bg-red-600 text-white',
        border: 'border-red-200/70 dark:border-red-900/40',
        title: 'text-red-700 dark:text-red-300',
      }
    case 'warning':
      return {
        badge: 'bg-amber-500 text-white',
        border: 'border-amber-200/70 dark:border-amber-900/40',
        title: 'text-amber-700 dark:text-amber-200',
      }
    default:
      return {
        badge: 'bg-brand-600 text-white',
        border: 'border-zinc-200/70 dark:border-zinc-800',
        title: 'text-brand-700 dark:text-brand-300',
      }
  }
}

export const ToastHost = () => {
  const items = useToastStore((s) => s.items)
  const dismiss = useToastStore((s) => s.dismiss)

  return (
    <div className="fixed right-4 top-20 z-70 w-[380px] max-w-[calc(100vw-2rem)] space-y-2">
      <AnimatePresence initial={false}>
        {items.map((t) => {
          const p = palette(t.variant)
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
              className={cn(
                'rounded-2xl border bg-white/95 dark:bg-zinc-900/95 backdrop-blur shadow-xl p-4',
                p.border,
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn('text-[10px] font-black tracking-widest uppercase px-2 py-1 rounded-lg', p.badge)}>
                      {t.variant}
                    </span>
                    {t.title ? (
                      <span className={cn('text-xs font-extrabold', p.title)}>{t.title}</span>
                    ) : null}
                  </div>
                  <div className="mt-2 text-sm font-semibold text-zinc-900 dark:text-white leading-snug">
                    {t.message}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => dismiss(t.id)}
                  className="shrink-0 rounded-xl border border-zinc-200/70 dark:border-zinc-800 p-2 text-zinc-600 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800/40 transition-colors"
                  aria-label="Dismiss"
                >
                  <X size={16} />
                </button>
              </div>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}

