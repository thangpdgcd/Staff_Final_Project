import { motion, type HTMLMotionProps } from 'framer-motion'
import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '@/utils/cn'

const base =
  'inline-flex items-center justify-center gap-2 rounded-xl font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30 disabled:opacity-60 disabled:pointer-events-none'

const variants = {
  primary:
    'bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-md shadow-brand-500/20 hover:from-brand-700 hover:to-brand-600',
  secondary:
    'border border-zinc-200/70 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/60 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 text-zinc-900 dark:text-zinc-100',
  ghost: 'hover:bg-zinc-100 dark:hover:bg-zinc-800/60 text-zinc-700 dark:text-zinc-200',
  danger:
    'bg-red-600 text-white hover:bg-red-700 shadow-md shadow-red-500/20 focus-visible:ring-red-500/30',
} as const

const sizes = {
  sm: 'h-9 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
  lg: 'h-11 px-5 text-sm',
} as const

type Variant = keyof typeof variants
type Size = keyof typeof sizes

type AsChildProps = {
  asChild: true
  variant?: Variant
  size?: Size
  className?: string
} & ComponentPropsWithoutRef<'span'>

type MotionProps = {
  asChild?: false
  variant?: Variant
  size?: Size
  className?: string
} & HTMLMotionProps<'button'>

export type ButtonProps = AsChildProps | MotionProps

export const Button = (props: ButtonProps) => {
  const variant = props.variant ?? 'primary'
  const size = props.size ?? 'md'
  const cls = cn(base, variants[variant], sizes[size], props.className)

  if ('asChild' in props && props.asChild) {
    const { asChild: _a, variant: _v, size: _s, className: _c, ...rest } = props as AsChildProps
    return <span className={cls} {...rest} />
  }

  const { variant: _v, size: _s, className: _c, type = 'button', ...rest } = props as MotionProps
  return (
    <motion.button
      type={type}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cls}
      {...rest}
    />
  )
}
