import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { staffApi } from '@/services/api/staffApi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { toast } from '@/store/toastStore'

const schema = z.object({
  toUserId: z.string().min(1),
  subject: z.string().min(1),
  content: z.string().min(1),
})

type EmailForm = z.infer<typeof schema>

export const StaffEmailPage = () => {
  const { t } = useTranslation()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm({ resolver: zodResolver(schema) })

  const onSubmit = async (values: EmailForm) => {
    try {
      await staffApi.sendEmail({
        toUserId: Number(values.toUserId),
        subject: values.subject,
        content: values.content,
      })
      reset()
      toast.success(t('staff.emailPage.sentMock'))
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
              <label className="text-xs font-bold text-zinc-600 dark:text-zinc-300">{t('staff.emailPage.toUserId')}</label>
              <Input {...register('toUserId')} className="mt-2" placeholder="123" inputMode="numeric" />
              {errors.toUserId ? <div className="mt-2 text-xs text-red-500">{t('common.required')}</div> : null}
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-600 dark:text-zinc-300">{t('staff.emailPage.subject')}</label>
              <Input {...register('subject')} className="mt-2" placeholder={t('staff.emailPage.subjectPlaceholder')} />
              {errors.subject ? <div className="mt-2 text-xs text-red-500">{t('common.required')}</div> : null}
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-600 dark:text-zinc-300">{t('staff.emailPage.content')}</label>
              <textarea
                {...register('content')}
                rows={6}
                className="mt-2 w-full rounded-2xl border border-zinc-200/70 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3 text-[15px] text-zinc-900 dark:text-zinc-100 shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-brand-500/20 focus-visible:border-brand-500 placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
                placeholder={t('staff.emailPage.contentPlaceholder')}
              />
              {errors.content ? <div className="mt-2 text-xs text-red-500">{t('common.required')}</div> : null}
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
              {isSubmitting ? <Spinner size="sm" className="border-white/40 border-t-white" /> : null}
              {isSubmitting ? t('staff.emailPage.sending') : t('staff.emailPage.send')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

