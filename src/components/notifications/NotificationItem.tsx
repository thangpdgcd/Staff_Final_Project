import { motion } from 'framer-motion'
import { BellRing, Info, CheckCircle2, AlertTriangle, XCircle, MessageSquare } from 'lucide-react'
import type { AppNotification } from '@/hooks/useNotifications'

const NotificationTypeIcon = ({ type }: { type: string | undefined }) => {
  const t = String(type ?? '').toLowerCase()
  const className = 'text-zinc-700 dark:text-zinc-200'

  if (t.includes('success')) return <CheckCircle2 size={18} className={className} />
  if (t.includes('warn')) return <AlertTriangle size={18} className={className} />
  if (t.includes('error') || t.includes('fail')) return <XCircle size={18} className={className} />
  if (t.includes('message') || t.includes('chat')) return <MessageSquare size={18} className={className} />
  if (t.includes('info')) return <Info size={18} className={className} />
  return <BellRing size={18} className={className} />
}

const timeAgo = (ts: unknown) => {
  const n =
    typeof ts === 'number'
      ? ts
      : typeof ts === 'string'
        ? Date.parse(ts)
        : NaN
  if (!Number.isFinite(n)) return ''
  const diff = Date.now() - n
  const s = Math.max(1, Math.floor(diff / 1000))
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

export const NotificationItem = ({
  n,
  onClick,
}: {
  n: AppNotification
  onClick: () => void
}) => {
  return (
    <motion.button
      type="button"
      whileHover={{ x: 2 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className={`w-full text-left p-3 rounded-2xl flex items-start gap-3 border transition-colors ${
        n.isRead
          ? 'bg-white dark:bg-zinc-900 border-zinc-200/60 dark:border-zinc-800'
          : 'bg-brand-50/80 dark:bg-brand-950/30 border-brand-200/70 dark:border-brand-800/70'
      }`}
    >
      <div className="mt-0.5 shrink-0">
        <div className="h-9 w-9 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
          <NotificationTypeIcon type={n.type} />
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-semibold text-zinc-900 dark:text-white leading-snug line-clamp-2">
          {n.message}
        </div>
        <div className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center justify-between gap-3">
          <span className="truncate">{String(n.type ?? 'info')}</span>
          <span className="shrink-0">{timeAgo(n.createdAt)}</span>
        </div>
      </div>
    </motion.button>
  )
}

