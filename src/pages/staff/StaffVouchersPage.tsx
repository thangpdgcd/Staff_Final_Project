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
import { Modal } from '@/components/ui/Modal'
import { toast } from '@/store/toastStore'
import { cn } from '@/utils/cn'
import { Copy, Pencil, Plus, Ticket, Trash2 } from 'lucide-react'
import { useAsyncCallback } from '@/hooks/useAsyncCallback'

const selectFieldClass =
  'h-11 w-full rounded-2xl border border-zinc-200/70 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 text-[15px] text-zinc-900 dark:text-zinc-100 shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-brand-500/20 focus-visible:border-brand-500'

const plainUser = (u) => u?.dataValues ?? u

const userIdFromRow = (u) => {
  const p = plainUser(u)
  const raw = p?.userId ?? p?.user_ID ?? p?.id
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
}

/** Chỉ gợi ý khách hàng; staff/admin không tạo voucher cho chính role nội bộ */
const isCustomerRole = (u) => {
  const r = String(plainUser(u)?.roleID ?? plainUser(u)?.roleId ?? '').trim().toLowerCase()
  if (!r) return true
  if (r === '2' || r === '3' || r === 'admin' || r === 'staff') return false
  return true
}

const pickCreatedAt = (u) => {
  const plain = u?.dataValues ?? u
  const raw = plain?.createdAt ?? plain?.created_at ?? plain?.timeCreated ?? null
  if (!raw) return null
  const ts = typeof raw === 'number' ? raw : Date.parse(String(raw))
  return Number.isFinite(ts) ? ts : null
}

const pickOrdersCount = (u) => {
  const plain = u?.dataValues ?? u
  const raw =
    plain?.ordersCount ?? plain?.orderCount ?? plain?.totalOrders ?? plain?.orders_count ?? null
  if (raw == null || raw === '') return null
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
}

/**
 * Staff chỉ được tạo voucher cho "người dùng mới".
 * FE cố gắng xác định dựa trên profile trả về từ BE (createdAt / ordersCount...).
 * Nếu không đủ dữ liệu để kết luận, FE cho phép và backend sẽ là nơi enforce cuối cùng.
 */
const isNewUserHeuristic = (user) => {
  const createdAt = pickCreatedAt(user)
  const ordersCount = pickOrdersCount(user)

  // If BE gives explicit ordersCount and it's > 0 => NOT new.
  if (ordersCount != null && ordersCount > 0) return { ok: false, reason: 'has_orders' }

  // If we can read createdAt and it's older than threshold => NOT new.
  if (createdAt != null) {
    const days = (Date.now() - createdAt) / (1000 * 60 * 60 * 24)
    // Treat accounts created within 7 days as "new".
    if (days <= 7) return { ok: true }
    return { ok: false, reason: 'too_old' }
  }

  // Unknown → allow (backend should validate).
  return { ok: true, reason: 'unknown' }
}

export const StaffVouchersPage = () => {
  const { t } = useTranslation()
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState({ items: [], total: 0, page: 1, pageSize: 20 })
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [selected, setSelected] = useState(null)
  const [createForm, setCreateForm] = useState({ type: 'percent', value: '10' })
  /** userId dạng string cho <select> — lấy từ DB (/users), không cần nhập tay */
  const [createCustomerId, setCreateCustomerId] = useState('')
  const [createUsers, setCreateUsers] = useState([])
  const [createUsersLoading, setCreateUsersLoading] = useState(false)
  const [editForm, setEditForm] = useState({ type: '', value: '', expiresAt: '' })

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

  const openCreate = () => {
    setCreateForm({ type: 'percent', value: '10' })
    setCreateCustomerId('')
    setCreateOpen(true)
  }

  useEffect(() => {
    if (!createOpen) return
    let cancelled = false
    setCreateUsersLoading(true)
    staffApi
      .listUsers()
      .then((body) => {
        if (cancelled) return
        const data = unwrapApiData(body)
        let rows = []
        if (Array.isArray(data)) rows = data
        else {
          const { items } = normalizeList(data, ['users', 'items', 'rows', 'data'])
          rows = Array.isArray(items) ? items : []
        }
        setCreateUsers(rows)
      })
      .catch(() => {
        if (!cancelled) setCreateUsers([])
      })
      .finally(() => {
        if (!cancelled) setCreateUsersLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [createOpen])

  /** Khách hàng từ DB, sắp xếp theo tên — hiển thị trong <select> */
  const customerOptions = useMemo(() => {
    const rows = createUsers
      .filter(isCustomerRole)
      .map((row) => {
        const p = plainUser(row)
        const uid = userIdFromRow(row)
        if (uid == null) return null
        const name = String(p?.name ?? '').trim() || `Khách #${uid}`
        const email = String(p?.email ?? '').trim()
        const label = email ? `${name} — ${email}` : name
        return { uid, name, email, label }
      })
      .filter(Boolean)
    rows.sort((a, b) => String(a.name).localeCompare(String(b.name), 'vi', { sensitivity: 'base' }))
    return rows
  }, [createUsers])

  const openEdit = (v) => {
    if (String(v?.id ?? '').startsWith('promo:') || v?.source === 'promo') {
      toast.info(t('staff.vouchersPage.promoEditBlocked'))
      return
    }
    setSelected(v)
    setEditForm({
      type: String(v?.type ?? ''),
      value: String(v?.value ?? ''),
      expiresAt: v?.expiresAt ? new Date(v.expiresAt).toISOString().slice(0, 16) : '',
    })
    setEditOpen(true)
  }

  const openDelete = (v) => {
    if (String(v?.id ?? '').startsWith('promo:') || v?.source === 'promo') {
      toast.info(t('staff.vouchersPage.promoDeleteBlocked'))
      return
    }
    setSelected(v)
    setDeleteOpen(true)
  }

  const ensureNewUser = async (userId) => {
    try {
      const body = await staffApi.getUserById(userId)
      const payload = unwrapApiData(body)
      const user = payload?.user ?? payload?.profile ?? payload
      const verdict = isNewUserHeuristic(user)
      if (!verdict.ok) {
        toast.error(
          verdict.reason === 'has_orders'
            ? 'Staff chỉ được tạo voucher cho người dùng mới (chưa có đơn hàng).'
            : 'Staff chỉ được tạo voucher cho người dùng mới.',
        )
        return false
      }
      return true
    } catch {
      // If we can't fetch user, do not block completely; let backend decide.
      return true
    }
  }

  const onCreate = async () => {
    if (busy) return
    const userId = Number(String(createCustomerId ?? '').trim())
    const type = String(createForm.type ?? '').trim()
    const valueRaw = String(createForm.value ?? '').trim()
    const value = Number(valueRaw)

    if (!createCustomerId || !Number.isFinite(userId) || userId <= 0)
      return toast.error(t('staff.vouchersPage.errPickCustomer'))
    if (!type || (type !== 'percent' && type !== 'fixed')) return toast.error('Chọn loại giảm giá (percent hoặc fixed).')
    if (!valueRaw || !Number.isFinite(value) || value <= 0) return toast.error(t('staff.vouchersPage.errInvalidValue'))

    setBusy(true)
    try {
      const ok = await ensureNewUser(userId)
      if (!ok) return
      await staffApi.createPrivateVoucher({ userId, type, value })
      toast.success(t('staff.vouchersPage.createSuccess'))
      setCreateOpen(false)
      await load()
    } catch (e) {
      toast.error(e?.response?.data?.message ?? e?.message ?? t('staff.vouchersPage.createFailed'))
    } finally {
      setBusy(false)
    }
  }

  const onEdit = async () => {
    if (busy) return
    const id = selected?.id
    if (id == null) return
    const patch = {
      type: String(editForm.type ?? '').trim(),
      value: Number(String(editForm.value ?? '').trim()),
      ...(editForm.expiresAt ? { expiresAt: new Date(editForm.expiresAt).toISOString() } : { expiresAt: null }),
    }
    if (!patch.type) return toast.error(t('staff.vouchersPage.errTypeRequired'))
    if (!Number.isFinite(patch.value) || patch.value <= 0) return toast.error(t('staff.vouchersPage.errInvalidValue'))

    setBusy(true)
    try {
      await staffApi.updateVoucher({ id, patch })
      toast.success(t('staff.vouchersPage.updateSuccess'))
      setEditOpen(false)
      await load()
    } catch (e) {
      toast.error(e?.response?.data?.message ?? e?.message ?? t('staff.vouchersPage.updateFailed'))
    } finally {
      setBusy(false)
    }
  }

  const onDelete = async () => {
    if (busy) return
    const id = selected?.id
    if (id == null) return
    setBusy(true)
    try {
      await staffApi.deleteVoucher({ id })
      toast.success(t('staff.vouchersPage.deleteSuccess'))
      setDeleteOpen(false)
      await load()
    } catch (e) {
      toast.error(e?.response?.data?.message ?? e?.message ?? t('staff.vouchersPage.deleteFailed'))
    } finally {
      setBusy(false)
    }
  }

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
            <div className="mt-4 flex flex-col sm:flex-row gap-2">
              <Button type="button" onClick={openCreate} className="sm:w-auto w-full">
                <Plus size={16} />
                {t('staff.vouchersPage.createCta')}
              </Button>
              <Button type="button" variant="secondary" onClick={load} className="sm:w-auto w-full">
                {loading ? <Spinner size="sm" /> : null}
                {t('common.refresh')}
              </Button>
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
                    <div className="flex flex-col gap-2 items-end">
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
                      <button
                        type="button"
                        className="inline-flex items-center justify-center rounded-xl border border-zinc-200/70 dark:border-zinc-800 p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
                        onClick={() => openEdit(v)}
                        aria-label="Edit voucher"
                        title="Edit"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        className="inline-flex items-center justify-center rounded-xl border border-red-200/70 dark:border-red-900/40 p-2 hover:bg-red-50 dark:hover:bg-red-950/40 text-red-700 dark:text-red-200"
                        onClick={() => openDelete(v)}
                        aria-label="Delete voucher"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
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
                    <th className="px-4 py-3 w-[150px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-zinc-900">
                  {loading ? (
                    <tr>
                      <td className="px-4 py-6 text-zinc-500 dark:text-zinc-400" colSpan={6}>
                        {t('common.loading')}
                      </td>
                    </tr>
                  ) : null}
                  {!loading && (data.items ?? []).length === 0 ? (
                    <tr>
                      <td className="px-4 py-6" colSpan={6}>
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
                      <td className="px-4 py-3">
                        {v.expiresAt ? new Date(v.expiresAt).toLocaleString() : t('common.dash')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {v.code ? (
                            <button
                              type="button"
                              className="inline-flex items-center justify-center rounded-lg p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
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
                          <button
                            type="button"
                            className="inline-flex items-center justify-center rounded-lg p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
                            onClick={() => openEdit(v)}
                            aria-label="Edit"
                            title="Edit"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            className="inline-flex items-center justify-center rounded-lg p-2 hover:bg-red-50 dark:hover:bg-red-950/40 text-red-700 dark:text-red-200"
                            onClick={() => openDelete(v)}
                            aria-label="Delete"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
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

      <Modal
        open={createOpen}
        onClose={() => (busy ? null : setCreateOpen(false))}
        title={t('staff.vouchersPage.createTitle')}
        description={t('staff.vouchersPage.createDesc')}
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-zinc-600 dark:text-zinc-300">{t('staff.vouchersPage.customer')}</label>
            {createUsersLoading ? (
              <div className="mt-2 flex items-center gap-2 text-sm text-zinc-500">
                <Spinner size="sm" />
                {t('common.loading')}
              </div>
            ) : customerOptions.length === 0 ? (
              <div className="mt-2 text-sm text-zinc-500">{t('staff.vouchersPage.noCustomers')}</div>
            ) : (
              <select
                className={cn(selectFieldClass, 'mt-2')}
                value={createCustomerId}
                onChange={(e) => setCreateCustomerId(e.target.value)}
                aria-label={t('staff.vouchersPage.customerAria')}
              >
                <option value="">{t('staff.vouchersPage.customerPlaceholder')}</option>
                {customerOptions.map((opt) => (
                  <option key={opt.uid} value={String(opt.uid)}>
                    {opt.label}
                  </option>
                ))}
              </select>
            )}
            {!createUsersLoading && customerOptions.length > 0 ? (
              <p className="mt-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                {t('staff.vouchersPage.customerHint')}
              </p>
            ) : null}
          </div>
          <div>
            <label className="text-xs font-bold text-zinc-600 dark:text-zinc-300">{t('staff.vouchersPage.discountType')}</label>
            <select
              className={cn(selectFieldClass, 'mt-2')}
              value={createForm.type}
              onChange={(e) => setCreateForm((s) => ({ ...s, type: e.target.value }))}
            >
              <option value="percent">{t('staff.vouchersPage.typePercent')}</option>
              <option value="fixed">{t('staff.vouchersPage.typeFixed')}</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-zinc-600 dark:text-zinc-300">
              {createForm.type === 'percent' ? t('staff.vouchersPage.valuePercent') : t('staff.vouchersPage.valueFixed')}
            </label>
            <Input
              value={createForm.value}
              onChange={(e) => setCreateForm((s) => ({ ...s, value: e.target.value }))}
              className="mt-2"
              inputMode="decimal"
              placeholder={createForm.type === 'percent' ? t('staff.vouchersPage.valuePlaceholderPercent') : t('staff.vouchersPage.valuePlaceholderFixed')}
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
            <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)} disabled={busy}>
              {t('common.close')}
            </Button>
            <Button type="button" onClick={onCreate} disabled={busy}>
              {busy ? <Spinner size="sm" /> : <Plus size={16} />}
              {t('staff.vouchersPage.createSubmit')}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={editOpen}
        onClose={() => (busy ? null : setEditOpen(false))}
        title="Cập nhật voucher"
        description={selected?.code ? `Code: ${selected.code}` : `ID: ${selected?.id ?? ''}`}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-zinc-600 dark:text-zinc-300">Type</label>
              <Input
                value={editForm.type}
                onChange={(e) => setEditForm((s) => ({ ...s, type: e.target.value }))}
                className="mt-2"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-zinc-600 dark:text-zinc-300">Value</label>
              <Input
                value={editForm.value}
                onChange={(e) => setEditForm((s) => ({ ...s, value: e.target.value }))}
                className="mt-2"
                inputMode="decimal"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-zinc-600 dark:text-zinc-300">Expires at</label>
            <Input
              value={editForm.expiresAt}
              onChange={(e) => setEditForm((s) => ({ ...s, expiresAt: e.target.value }))}
              className="mt-2"
              type="datetime-local"
            />
            <div className="mt-2 text-[11px] text-zinc-500 dark:text-zinc-400">
              Để trống để xoá hạn sử dụng (set null).
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
            <Button type="button" variant="secondary" onClick={() => setEditOpen(false)} disabled={busy}>
              {t('common.close')}
            </Button>
            <Button type="button" onClick={onEdit} disabled={busy}>
              {busy ? <Spinner size="sm" /> : <Pencil size={16} />}
              Lưu
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={deleteOpen}
        onClose={() => (busy ? null : setDeleteOpen(false))}
        title="Xoá voucher"
        description="Hành động này không thể hoàn tác."
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-red-200/70 dark:border-red-900/40 bg-red-50 dark:bg-red-950/30 p-4 text-sm text-red-900 dark:text-red-100">
            Bạn chắc chắn muốn xoá voucher{' '}
            <span className="font-black">{selected?.code ? selected.code : `#${selected?.id ?? ''}`}</span>?
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
            <Button type="button" variant="secondary" onClick={() => setDeleteOpen(false)} disabled={busy}>
              {t('common.close')}
            </Button>
            <Button type="button" variant="danger" onClick={onDelete} disabled={busy}>
              {busy ? <Spinner size="sm" /> : <Trash2 size={16} />}
              Xoá
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

