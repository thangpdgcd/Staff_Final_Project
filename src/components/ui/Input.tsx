import type { ComponentProps } from 'react'
import { cn } from '@/utils/cn'

export const Input = ({ className, ...props }: ComponentProps<'input'>) => {
  return (
    <input
      className={cn(
        'h-11 w-full rounded-2xl border border-zinc-200/70 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 text-[15px] text-zinc-900 dark:text-zinc-100 shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-brand-500/20 focus-visible:border-brand-500 placeholder:text-zinc-400 dark:placeholder:text-zinc-500',
        className,
      )}
      {...props}
    />
  )
}
