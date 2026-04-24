import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

type EmptyStateProps = {
  icon?: LucideIcon
  title?: string
  description?: string
  action?: ReactNode
  className?: string
}

export const EmptyState = ({ icon: Icon, title, description, action, className }: EmptyStateProps) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center rounded-3xl border border-dashed border-zinc-200/70 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/40 p-8',
        className,
      )}
    >
      {Icon ? (
        <div className="h-12 w-12 rounded-2xl bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 flex items-center justify-center">
          <Icon size={22} />
        </div>
      ) : null}
      {title ? <h3 className="mt-4 text-base sm:text-lg font-black tracking-tight">{title}</h3> : null}
      {description ? <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400 max-w-sm">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}
