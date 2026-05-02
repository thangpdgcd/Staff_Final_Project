// @ts-nocheck — voucher rows from API
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { staffApi } from '@/api/staffApi'
import { normalizeList, unwrapApiData } from '@/utils/apiResponse'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Copy, Ticket } from 'lucide-react'
import { useAsyncCallback } from '@/hooks/useAsyncCallback'

export const StaffVouchersPage = () => {
  const { t } = useTranslation()
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState({ items: [], total: 0, page: 1, pageSize: 20 })
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState(null)

  const { run: load } = useAsyncCallback(
    useCallback(async () => {
      // keep local loading flag for button spinners already in UI
      setLoading(true)
      try {
        const res = await staffApi.listVouchers({ q, page, pageSize: 20 })
        const payload = unwrapApiData(res)
        const normalized = normalizeList(payload, ['items', 'rows', 'data'])
        setData({
          items: normalized.items ?? [],
          total: normalized.total ?? 0,
          page,
          pageSize: 20,
        })
      } catch (error) {
        console.error('Failed to load vouchers:', error)
        setData({ items: [], total: 0, page: 1, pageSize: 20 })
      } finally {
        setLoading(false)
      }
    }, [q, page]),
    [q, page],
  )

  useEffect(() => {
    load()
  }, [load])

  const totalPages = useMemo(() => Math.max(1, Math.ceil((data.total ?? 0) / (data.pageSize ?? 20))), [data])

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('staff.vouchers')}</CardTitle>
          <div className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{t('staff.vouchersPage.subtitle')}</div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-2xl border border-zinc-200/70 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60 p-4">
            <div className="font-black tracking-tight">{t('staff.vouchersPage.sendCardTitle')}</div>
            <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              {t('staff.vouchersPage.sendCardHint')}
            </div>
            {notice ? (
              <div
                className={`mt-3 rounded-2xl px-4 py-3 text-sm border ${
                  notice.type === 'success'
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-900/60'
                    : 'bg-red-50 text-red-900 border-red-200 dark:bg-red-950/40 dark:text-red-200 dark:border-red-900/60'
                }`}
              >
                {notice.message}
              </div>
            ) : null}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('staff.vouchersPage.searchPlaceholder')} />
            <Button type="button" variant="secondary" onClick={load} className="sm:w-auto w-full">
              {loading ? <Spinner size="sm" /> : null}
              {t('common.refresh')}
            </Button>
          </div>

          <div className="rounded-2xl border border-zinc-200/70 dark:border-zinc-800 overflow-hidden">
            {/* Mobile: cards */}
            <div className="sm:hidden p-4 space-y-3 bg-white dark:bg-zinc-900">
              {loading ? (
                <div className="text-sm text-zinc-500 dark:text-zinc-400">{t('common.loading')}</div>
              ) : null}
              {!loading && (data.items ?? []).length === 0 ? (
                <EmptyState
                  icon={Ticket}
                  title={t('staff.vouchersPage.emptyTitle')}
                  description={t('staff.vouchersPage.emptyDesc')}
                  className="border-0 bg-transparent p-0"
                />
              ) : null}
              {(data.items ?? []).map((v) => (
                <div
                  key={v.id}
                  className="rounded-2xl border border-zinc-200/70 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/20 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-black truncate">{v.code}</div>
                      <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400 truncate">
                        {t('staff.vouchersPage.rowUser', { userId: v.userId })} · {v.type} · {String(v.value)}
                      </div>
                      <div className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                        {t('staff.vouchersPage.rowExpires', {
                          date: v.expiresAt ? new Date(v.expiresAt).toLocaleString() : t('common.dash'),
                        })}
                      </div>
                    </div>
                    {v.code ? (
                      <button
                        type="button"
                        className="inline-flex items-center justify-center rounded-xl border border-zinc-200/70 dark:border-zinc-800 p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(String(v.code))
                            setNotice({ type: 'success', message: t('common.copiedWithValue', { value: v.code }) })
                          } catch {
                            setNotice({ type: 'error', message: t('common.copyFailed') })
                          }
                        }}
                        aria-label={t('common.copyCode')}
                        title={t('common.copyCode')}
                      >
                        <Copy size={14} />
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>

            {/* Tablet/Desktop: table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-50 dark:bg-zinc-800/60 text-xs uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                  <tr>
                    <th className="px-4 py-3">{t('staff.vouchersPage.colCode')}</th>
                    <th className="px-4 py-3">{t('staff.vouchersPage.colUser')}</th>
                    <th className="px-4 py-3">{t('staff.vouchersPage.colType')}</th>
                    <th className="px-4 py-3">{t('staff.vouchersPage.colValue')}</th>
                    <th className="px-4 py-3">{t('staff.vouchersPage.colExpires')}</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-zinc-900">
                  {loading ? (
                    <tr>
                      <td className="px-4 py-6 text-zinc-500 dark:text-zinc-400" colSpan={5}>
                        {t('common.loading')}
                      </td>
                    </tr>
                  ) : null}
                  {!loading && (data.items ?? []).length === 0 ? (
                    <tr>
                      <td className="px-4 py-6" colSpan={5}>
                        <EmptyState
                          icon={Ticket}
                          title={t('staff.vouchersPage.emptyTitle')}
                          description={t('staff.vouchersPage.emptyDesc')}
                          className="border-0 bg-transparent p-0"
                        />
                      </td>
                    </tr>
                  ) : null}
                  {(data.items ?? []).map((v) => (
                    <tr key={v.id} className="border-t border-zinc-200/70 dark:border-zinc-800">
                      <td className="px-4 py-3 font-semibold">{v.code}</td>
                      <td className="px-4 py-3">{v.userId}</td>
                      <td className="px-4 py-3">{v.type}</td>
                      <td className="px-4 py-3">{String(v.value)}</td>
                      <td className="px-4 py-3 flex items-center gap-2">
                        <span>{v.expiresAt ? new Date(v.expiresAt).toLocaleString() : t('common.dash')}</span>
                        {v.code ? (
                          <button
                            type="button"
                            className="inline-flex items-center justify-center rounded-lg p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(String(v.code))
                                setNotice({ type: 'success', message: t('common.copiedWithValue', { value: v.code }) })
                              } catch {
                                setNotice({ type: 'error', message: t('common.copyFailed') })
                              }
                            }}
                            aria-label={t('common.copyCode')}
                            title={t('common.copyCode')}
                          >
                            <Copy size={14} />
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              {t('common.paginationSummary', { page, totalPages, total: data.total ?? 0 })}
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                {t('common.prev')}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                {t('common.next')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

