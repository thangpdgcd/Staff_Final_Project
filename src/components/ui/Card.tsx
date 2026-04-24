import type { HTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

export const Card = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => {
  return (
    <div
      className={cn(
        'rounded-3xl border border-zinc-200/70 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm',
        className,
      )}
      {...props}
    />
  )
}

export const CardHeader = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => {
  return <div className={cn('p-5 sm:p-6 border-b border-zinc-200/70 dark:border-zinc-800', className)} {...props} />
}

export const CardTitle = ({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) => {
  return <h3 className={cn('text-base sm:text-lg font-black tracking-tight', className)} {...props} />
}

export const CardContent = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => {
  return <div className={cn('p-5 sm:p-6', className)} {...props} />
}
