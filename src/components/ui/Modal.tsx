import { useEffect, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/utils/cn'
import { modalBackdrop, modalPanel, press } from '@/components/animations/variants'

type ModalProps = {
  open: boolean
  onClose?: () => void
  title?: ReactNode
  description?: ReactNode
  children?: ReactNode
  className?: string
}

export const Modal = ({ open, onClose, title, description, children, className }: ModalProps) => {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6"
          initial="initial"
          animate="animate"
          exit="exit"
        >
          <motion.button
            type="button"
            aria-label="Close dialog"
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            variants={modalBackdrop}
            onClick={() => onClose?.()}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            className={cn(
              'relative z-10 w-full max-w-lg rounded-3xl border border-zinc-200/70 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xl',
              className,
            )}
            variants={modalPanel}
            transition={{ duration: 0.18 }}
          >
            <div className="p-5 sm:p-6 border-b border-zinc-200/70 dark:border-zinc-800 flex items-start justify-between gap-3">
              <div className="min-w-0">
                {title ? <div className="text-base sm:text-lg font-black tracking-tight">{title}</div> : null}
                {description ? <div className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{description}</div> : null}
              </div>
              <motion.button
                type="button"
                aria-label="Close"
                {...press}
                className="shrink-0 rounded-xl border border-zinc-200/70 dark:border-zinc-800 p-2 text-zinc-600 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800/60 transition-colors"
                onClick={() => onClose?.()}
              >
                <X size={18} />
              </motion.button>
            </div>

            <div className="p-5 sm:p-6">{children}</div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
