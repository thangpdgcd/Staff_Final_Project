import type { HTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

type SpinnerProps = HTMLAttributes<HTMLSpanElement> & {
  size?: 'sm' | 'md' | 'lg'
}

export const Spinner = ({ className, size = 'md', ...props }: SpinnerProps) => {
  const dims = size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-6 w-6' : 'h-5 w-5'
  return (
    <span
      aria-label="Loading"
      role="status"
      className={cn(
        'inline-block animate-spin rounded-full border-2 border-zinc-300 border-t-brand-600 dark:border-zinc-700 dark:border-t-brand-400',
        dims,
        className,
      )}
      {...props}
    />
  )
}
