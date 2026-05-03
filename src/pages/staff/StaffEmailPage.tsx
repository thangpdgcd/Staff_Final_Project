import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { staffApi } from '@/api/staffApi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { toast } from '@/store/toastStore'
import { translateFieldTowardUiLang } from '@/utils/translateViEn'

const unwrapUsersList = (res: unknown): unknown[] => {
  const payload = res as Record<string, unknown> | unknown[] | null | undefined
  if (Array.isArray(payload)) return payload
  if (!payload || typeof payload !== 'object') return []
  const o = payload as Record<string, unknown>
  const d = o.data ?? o.result ?? o.items
  if (Array.isArray(d)) return d
  if (d && typeof d === 'object') {
    const inner = (d as Record<string, unknown>).items ?? (d as Record<string, unknown>).rows
    if (Array.isArray(inner)) return inner
  }
  return []
}

const schema = z.object({
  toUserId: z.string().min(1),
  subject: z.string().min(1),
  /** RHF field name avoids clashing rare edge cases with generic `content`; API still expects `content` */
  messageBody: z.string().min(1),
})

type EmailForm = z.infer<typeof schema>

const VIET_CHARS_RE = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđĐ]/

const detectContentLocale = (subject: string, content: string): 'vi' | 'en' | 'mixed' => {
  const blob = `${subject}\n${content}`
  const hasVi = VIET_CHARS_RE.test(blob)
  const hasEn = /[A-Za-z]{2,}/.test(blob)
  if (hasVi && hasEn) return 'mixed'
  if (hasVi) return 'vi'
  return 'en'
}

type CustomerRow = {
  userId?: number
  user_ID?: number
  id?: number
  name?: string
  email?: string
  roleID?: string | number
}

export const StaffEmailPage = () => {
  const { t, i18n } = useTranslation()
  const [users, setUsers] = useState<CustomerRow[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [translatingFields, setTranslatingFields] = useState(false)
  const translateAbortRef = useRef<AbortController | null>(null)
  const {
    register,
    handleSubmit,
    watch,
    getValues,
    setValue,
    formState: { errors, isSubmitting },
    reset,
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      toUserId: '',
      subject: '',
      messageBody: '',
    },
  })

  const watchedSubject = watch('subject') ?? ''
  const watchedBody = watch('messageBody') ?? ''
  const contentLocalePreview = useMemo(
    () => detectContentLocale(String(watchedSubject), String(watchedBody)),
    [watchedSubject, watchedBody],
  )

  /** So spell‑check/fonts match typed text while UI stays EN/VI */
  const messageInputLang = contentLocalePreview === 'en' ? 'en' : 'vi'

  useEffect(() => {
    const normalize = (lng: string) => (lng.startsWith('vi') ? 'vi' : 'en')

    const onLanguageChanged = async (lng: string) => {
      const subject = String(getValues('subject') ?? '')
      const messageBody = String(getValues('messageBody') ?? '')
      const targetUi = normalize(lng)
      if (!subject.trim() && !messageBody.trim()) return

      translateAbortRef.current?.abort()
      const ac = new AbortController()
      translateAbortRef.current = ac
      const { signal } = ac

      try {
        setTranslatingFields(true)
        const [nextSubject, nextBody] = await Promise.all([
          translateFieldTowardUiLang(subject, targetUi, signal),
          translateFieldTowardUiLang(messageBody, targetUi, signal),
        ])
        if (signal.aborted) return
        const unchanged = nextSubject === subject && nextBody === messageBody
        if (!unchanged) {
          if (subject.trim()) setValue('subject', nextSubject, { shouldValidate: true, shouldDirty: true })
          if (messageBody.trim()) setValue('messageBody', nextBody, { shouldValidate: true, shouldDirty: true })
          toast.success(t('staff.emailPage.translateDone'))
        }
      } catch (e: unknown) {
        const name = (e as Error)?.name
        const msg = String((e as Error)?.message ?? '')
        if (signal.aborted || name === 'AbortError' || msg.toLowerCase().includes('abort')) return
        toast.error(t('staff.emailPage.translateFailed'))
      } finally {
        if (!signal.aborted) setTranslatingFields(false)
      }
    }

    i18n.on('languageChanged', onLanguageChanged)
    return () => {
      translateAbortRef.current?.abort()
      i18n.off('languageChanged', onLanguageChanged)
    }
  }, [i18n, getValues, setValue, t])

  useEffect(() => {
    const run = async () => {
      try {
        setLoadingUsers(true)
        const res = await staffApi.listCustomersWithEmail()
        const items = unwrapUsersList(res) as CustomerRow[]
        setUsers(items)
      } catch (e: unknown) {
        setUsers([])
        const apiMsg = String((e as any)?.response?.data?.message ?? '').trim()
        toast.error(apiMsg ? `${t('staff.emailPage.loadRecipientsFailed')}: ${apiMsg}` : t('staff.emailPage.loadRecipientsFailed'))
      } finally {
        setLoadingUsers(false)
      }
    }
    void run()
  }, [t])

  const customerOptions = useMemo(() => {
    const normRole = (r: any) => String(r ?? '').trim().toLowerCase()
    const loc = i18n.language?.startsWith('vi') ? 'vi' : 'en'
    return (users || [])
      .filter((u) => {
        const r = normRole((u as any).roleID)
        return r === '1' || r === 'user' || r === 'customer'
      })
      .map((u) => {
        const uid = (u as any).userId ?? (u as any).user_ID ?? (u as any).id
        const nm = String((u as any).name ?? '').trim()
        const em = String((u as any).email ?? '').trim()
        const displayName = nm || t('common.user')
        return {
          value: String(uid ?? ''),
          label: em ? `${displayName} — ${em}` : displayName,
        }
      })
      .filter((x) => x.value && /^[0-9]+$/.test(x.value))
      .filter((x) => x.label.includes('@'))
      .sort((a, b) => a.label.localeCompare(b.label, loc))
  }, [users, i18n.language, t])

  const onSubmit = async (values: EmailForm) => {
    try {
      await staffApi.sendEmail({
        toUserId: Number(values.toUserId),
        subject: values.subject,
        content: values.messageBody,
      })
      reset()
      toast.success(t('staff.emailPage.sentSuccess'))
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? e?.message ?? t('common.requestFailed'))
    }
  }

  return (
    <div className="space-y-6">
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>{t('staff.email')}</CardTitle>
          <div className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{t('staff.emailPage.subtitle')}</div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-zinc-600 dark:text-zinc-300">{t('staff.emailPage.recipientCustomer')}</label>
              <select
                {...register('toUserId')}
                aria-label={t('staff.emailPage.recipientCustomer')}
                className="mt-2 w-full rounded-2xl border border-zinc-200/70 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3 text-[15px] text-zinc-900 dark:text-zinc-100 shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-brand-500/20 focus-visible:border-brand-500"
                disabled={loadingUsers || translatingFields}
              >
                <option value="">{loadingUsers ? t('common.loading') : t('staff.emailPage.recipientPlaceholder')}</option>
                {customerOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">{t('staff.emailPage.recipientHint')}</p>
              {!loadingUsers && customerOptions.length === 0 ? (
                <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">{t('staff.emailPage.noRecipients')}</p>
              ) : null}
              {errors.toUserId ? <div className="mt-2 text-xs text-red-500">{t('staff.emailPage.errPickRecipient')}</div> : null}
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-600 dark:text-zinc-300" htmlFor="staff-email-subject">
                {t('staff.emailPage.subject')}
              </label>
              <Input
                id="staff-email-subject"
                {...register('subject')}
                className="mt-2"
                placeholder={t('staff.emailPage.subjectPlaceholder')}
                disabled={translatingFields}
              />
              <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">{t('staff.emailPage.subjectBilingualHint')}</p>
              {errors.subject ? <div className="mt-2 text-xs text-red-500">{t('common.required')}</div> : null}
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-600 dark:text-zinc-300" htmlFor="staff-email-message-body">
                {t('staff.emailPage.content')}
              </label>
              <textarea
                {...register('messageBody')}
                id="staff-email-message-body"
                rows={6}
                lang={messageInputLang}
                spellCheck
                disabled={translatingFields}
                className="mt-2 min-h-[156px] w-full rounded-2xl border border-zinc-200/70 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3 text-[15px] text-zinc-900 dark:text-zinc-100 shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-brand-500/20 focus-visible:border-brand-500 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 disabled:opacity-60"
                placeholder={t('staff.emailPage.contentPlaceholder')}
              />
              <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">{t('staff.emailPage.contentBilingualHint')}</p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{t('staff.emailPage.uiVersusTypingHint')}</p>
              {errors.messageBody ? <div className="mt-2 text-xs text-red-500">{t('common.required')}</div> : null}
            </div>

            <div
              className="rounded-2xl border border-zinc-200/60 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-950/40 px-4 py-3 text-xs text-zinc-600 dark:text-zinc-300"
              lang={i18n.language}
            >
              <span className="font-bold">{t('staff.emailPage.contentLanguageLabel')}: </span>
              {contentLocalePreview === 'vi'
                ? t('staff.emailPage.localeVi')
                : contentLocalePreview === 'mixed'
                  ? t('staff.emailPage.localeMixed')
                  : t('staff.emailPage.localeEn')}
            </div>

            <Button type="submit" disabled={isSubmitting || translatingFields} className="w-full sm:w-auto">
              {(isSubmitting || translatingFields) ? <Spinner size="sm" className="border-white/40 border-t-white" /> : null}
              {translatingFields ? t('staff.emailPage.translating') : isSubmitting ? t('staff.emailPage.sending') : t('staff.emailPage.send')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

