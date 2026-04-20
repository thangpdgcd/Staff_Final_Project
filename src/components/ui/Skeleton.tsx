import type { HTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

export const Skeleton = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => {
  return (
    <div
      className={cn(
        'animate-pulse rounded-2xl bg-zinc-200/70 dark:bg-zinc-800/70',
        className,
      )}
      {...props}
    />
  )
}
