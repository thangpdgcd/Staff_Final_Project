// @ts-nocheck — order rows from API
import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { staffApi } from '@/api/staffApi'
import { connectSocket } from '@/services/socket/socketClient'
import { unwrapApiData, normalizeList } from '@/utils/apiResponse'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { useAsyncCallback } from '@/hooks/useAsyncCallback'
import { toast } from '@/store/toastStore'

const norm = (s) => String(s ?? '').trim().toLowerCase()

const orderIdOf = (o) => o?.orderId ?? o?.order_ID ?? o?.id

const customerNameOf = (o) => {
  const u = o?.users ?? o?.user
  if (u && typeof u === 'object') return u.name ?? u.email ?? '—'
  return '—'
}

export const StaffOrdersPage = () => {
  const { t, i18n } = useTranslation()
  const [orders, setOrders] = useState([])
  const [busyId, setBusyId] = useState(null)
  const [history, setHistory] = useState<any[]>([])
  const numberLocale = i18n.language === 'vi' ? 'vi-VN' : 'en-US'
  const [loadingSince, setLoadingSince] = useState<number | null>(null)
  const [nowMs, setNowMs] = useState(0)

  const HISTORY_KEY = 'staff_order_history_v1'

  useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY)
      const parsed = raw ? JSON.parse(raw) : []
      setHistory(Array.isArray(parsed) ? parsed : [])
    } catch {
      setHistory([])
    }
  }, [])

  const pushHistory = useCallback(
    (entry) => {
      setHistory((prev) => {
        const next = [
          {
            id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            ts: Date.now(),
            ...entry,
          },
          ...(Array.isArray(prev) ? prev : []),
        ].slice(0, 40)
        try {
          localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
        } catch {
          // ignore
        }
        return next
      })
    },
    [HISTORY_KEY],
  )

  const statusLabel = (status) => {
    const s = norm(status)
    const key = `staff.orderStatus.${s}`
    const translated = t(key, { defaultValue: '' })
    return translated ? translated : String(status ?? t('common.dash'))
  }

  const { run: load, loading, error } = useAsyncCallback(
    useCallback(async () => {
      // axios already has a request timeout (see `httpClient.ts`).
      // Avoid Promise.race with an uncancelled timer which can cause unhandled rejections later.
      const body = await staffApi.listStaffOrders()
      const payload = unwrapApiData(body)
      const { items } = normalizeList(payload, ['orders', 'items', 'rows', 'data'])
      setOrders(Array.isArray(items) ? items : [])
    }, []),
    [],
  )

  useEffect(() => {
    load().catch(() => setOrders([]))
  }, [load])

  // Realtime: refresh list when customers create/update orders.
  useEffect(() => {
    const s = connectSocket()
    if (!s) return

    let timer: number | null = null
    const scheduleRefresh = () => {
      if (timer != null) return
      timer = window.setTimeout(() => {
        timer = null
        load().catch(() => {})
      }, 350)
    }

    const onOrderEvent = () => scheduleRefresh()

    // Staff room receives these from backend (see backend `events.order.*`)
    s.on('order:new', onOrderEvent)
    s.on('order:update', onOrderEvent)
    s.on('order_updated', onOrderEvent)
    s.on('order_cancelled', onOrderEvent)
    s.on('order_completed', onOrderEvent)

    return () => {
      if (timer != null) window.clearTimeout(timer)
      s.off('order:new', onOrderEvent)
      s.off('order:update', onOrderEvent)
      s.off('order_updated', onOrderEvent)
      s.off('order_cancelled', onOrderEvent)
      s.off('order_completed', onOrderEvent)
    }
  }, [load])

  useEffect(() => {
    if (loading) {
      setLoadingSince((s) => s ?? Date.now())
      return
    }
    setLoadingSince(null)
  }, [loading])

  useEffect(() => {
    if (!loadingSince) return
    setNowMs(Date.now())
    const tmr = window.setInterval(() => setNowMs(Date.now()), 750)
    return () => window.clearInterval(tmr)
  }, [loadingSince])

  const isTakingLong = useMemo(() => {
    if (!loadingSince) return false
    return nowMs - loadingSince > 8000
  }, [loadingSince, nowMs])

  const patch = async (orderId, status) => {
    setBusyId(orderId)
    try {
      await staffApi.patchOrderStatus(orderId, status)
      await load()
      pushHistory({ orderId, action: 'status', nextStatus: status })
      toast.success(`#${orderId} → ${statusLabel(status)}`)
    } catch (e) {
      console.error(e)
      toast.error(e?.response?.data?.message ?? e?.message ?? t('staff.ordersPage.alertUpdateStatusFailed'))
    } finally {
      setBusyId(null)
    }
  }

  const resolveRefund = async (orderId, approved) => {
    setBusyId(orderId)
    try {
      await staffApi.resolveRefund(orderId, approved)
      await load()
      pushHistory({ orderId, action: 'refund', approved })
      toast.success(approved ? t('staff.ordersPage.alertRefundApproved') : t('staff.ordersPage.alertRefundRejected'))
    } catch (e) {
      console.error(e)
      toast.error(e?.response?.data?.message ?? e?.message ?? t('staff.ordersPage.alertRefundFailed'))
    } finally {
      setBusyId(null)
    }
  }

  const actionsFor = (o) => {
    const id = orderIdOf(o)
    if (!id) return null
    const s = norm(o.status)
    const busy = busyId === id

    if (s === 'pending') {
      return (
        <Button
          type="button"
          size="sm"
          disabled={busy}
          onClick={() => patch(id, 'confirmed')}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          {t('staff.ordersPage.actionApprove')}
        </Button>
      )
    }
    if (s === 'confirmed') {
      return (
        <Button
          type="button"
          size="sm"
          disabled={busy}
          onClick={() => patch(id, 'processing')}
        >
          {t('staff.ordersPage.actionProcessing')}
        </Button>
      )
    }
    if (s === 'processing') {
      return (
        <Button
          type="button"
          size="sm"
          disabled={busy}
          onClick={() => patch(id, 'shipped')}
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          {t('staff.ordersPage.actionShipped')}
        </Button>
      )
    }
    if (s === 'shipped') {
      return (
        <Button
          type="button"
          size="sm"
          disabled={busy}
          onClick={() => patch(id, 'completed')}
          className="bg-zinc-800 hover:bg-zinc-900 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900"
        >
          {t('staff.ordersPage.actionCompleted')}
        </Button>
      )
    }
    if (s === 'refund_requested') {
      return (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            disabled={busy}
            onClick={() => resolveRefund(id, true)}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {t('staff.ordersPage.actionApproveRefund')}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={() => resolveRefund(id, false)}
          >
            {t('common.reject')}
          </Button>
        </div>
      )
    }
    return <span className="text-xs text-zinc-500">{t('common.dash')}</span>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-zinc-900 dark:text-white">{t('staff.orders')}</h1>
          
        </div>
        <Button
          type="button"
          onClick={load}
          disabled={loading}
          variant="secondary"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          {t('common.refresh')}
        </Button>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {loading && orders.length === 0 ? (
            <div className="p-6 sm:p-8 space-y-3">
              {isTakingLong ? (
                <div className="mb-4 rounded-2xl bg-brand-50/60 px-4 py-3 text-sm text-brand-800">
                  <div className="font-extrabold">{t('common.loadingTakingLong')}</div>
                  <div className="mt-1 text-xs text-brand-700">{t('common.loadingTakingLongHint')}</div>
                  <div className="mt-3">
                    <Button type="button" variant="secondary" onClick={load}>
                      {t('common.retry')}
                    </Button>
                  </div>
                </div>
              ) : null}
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          ) : error ? (
            <div className="p-6 sm:p-8">
              <EmptyState
                title={t('common.loadFailed')}
                description={t('common.checkConnection')}
                action={
                  <Button type="button" variant="secondary" onClick={load}>
                    {t('common.retry')}
                  </Button>
                }
              />
            </div>
          ) : orders.length === 0 ? (
            <div className="p-6 sm:p-8">
              <EmptyState title={t('staff.ordersPage.emptyTitle')} description={t('staff.ordersPage.emptyDesc')} />
            </div>
          ) : (
            <>
              {loading ? (
                <div className="px-4 py-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-50/60 dark:bg-zinc-900/40 border-b border-zinc-200/60 dark:border-zinc-800">
                  {t('common.loading')}…
                </div>
              ) : null}
              {/* Mobile: card list */}
              <div className="sm:hidden p-4 space-y-3">
                {orders.map((o) => {
                  const id = orderIdOf(o)
                  const total = Number(o.total_Amount ?? o.totalAmount ?? 0).toLocaleString(numberLocale)
                  return (
                    <motion.div
                      key={id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-2xl border border-zinc-200/70 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-black tracking-tight truncate">#{id}</div>
                          <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400 truncate">
                            {customerNameOf(o)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-bold text-zinc-500 dark:text-zinc-400">{t('staff.ordersPage.total')}</div>
                          <div className="text-sm font-black">{total}</div>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <div className="text-xs font-semibold px-2 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200">
                          {statusLabel(o.status)}
                        </div>
                        <div className="shrink-0">{actionsFor(o)}</div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>

              {/* Tablet/Desktop: table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-zinc-50 dark:bg-zinc-800/80 text-xs uppercase text-zinc-500">
                    <tr>
                      <th className="px-4 py-3">{t('staff.ordersPage.colOrderId')}</th>
                      <th className="px-4 py-3">{t('staff.ordersPage.colCustomer')}</th>
                      <th className="px-4 py-3">{t('staff.ordersPage.colTotal')}</th>
                      <th className="px-4 py-3">{t('staff.ordersPage.colStatus')}</th>
                      <th className="px-4 py-3 w-[280px]">{t('staff.ordersPage.colActions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o) => {
                      const id = orderIdOf(o)
                      return (
                        <motion.tr key={id} layout className="border-t border-zinc-100 dark:border-zinc-800">
                          <td className="px-4 py-3 font-mono font-semibold">#{id}</td>
                          <td className="px-4 py-3">{customerNameOf(o)}</td>
                          <td className="px-4 py-3">
                            {Number(o.total_Amount ?? o.totalAmount ?? 0).toLocaleString(numberLocale)}
                          </td>
                          <td className="px-4 py-3 text-xs font-semibold">{statusLabel(o.status)}</td>
                          <td className="px-4 py-3">{actionsFor(o)}</td>
                        </motion.tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
        )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 sm:p-8">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-black text-zinc-900 dark:text-white">Lịch sử thao tác</div>
              <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Các đơn bạn đã xác nhận / xử lý hoàn tiền gần đây.</div>
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setHistory([])
                try { localStorage.removeItem(HISTORY_KEY) } catch {}
                toast.info('Đã xoá lịch sử')
              }}
            >
              Xoá
            </Button>
          </div>

          {history.length === 0 ? (
            <div className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">Chưa có thao tác nào.</div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase text-zinc-500">
                  <tr className="border-b border-zinc-200/60 dark:border-zinc-800">
                    <th className="py-2 pr-4">Thời gian</th>
                    <th className="py-2 pr-4">Đơn</th>
                    <th className="py-2 pr-4">Hành động</th>
                    <th className="py-2">Chi tiết</th>
                  </tr>
                </thead>
                <tbody>
                  {history.slice(0, 12).map((h) => (
                    <tr key={h.id} className="border-b border-zinc-100 dark:border-zinc-800/60">
                      <td className="py-2 pr-4 text-xs text-zinc-500 dark:text-zinc-400">
                        {new Date(Number(h.ts || Date.now())).toLocaleString(i18n.language === 'vi' ? 'vi-VN' : 'en-US')}
                      </td>
                      <td className="py-2 pr-4 font-mono">#{h.orderId}</td>
                      <td className="py-2 pr-4 font-semibold">
                        {h.action === 'refund' ? 'Hoàn tiền' : 'Cập nhật trạng thái'}
                      </td>
                      <td className="py-2 text-xs text-zinc-600 dark:text-zinc-300">
                        {h.action === 'refund'
                          ? h.approved ? 'Duyệt hoàn' : 'Từ chối hoàn'
                          : `→ ${String(h.nextStatus ?? '').toUpperCase()}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
