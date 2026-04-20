// @ts-nocheck — profile payload from API
import { useCallback, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { staffApi } from '@/services/api/staffApi'
import { useAuthStore } from '@/store/authStore'
import { unwrapApiData } from '@/utils/apiResponse'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { Spinner } from '@/components/ui/Spinner'
import { toast } from '@/store/toastStore'

const profileSchema = z.object({
  name: z.string().min(1),
  phoneNumber: z.string().optional(),
  address: z.string().optional(),
})

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
})

export const StaffProfilePage = () => {
  const { t } = useTranslation()
  const updateUser = useAuthStore((s) => s.updateUser)
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm({ resolver: zodResolver(profileSchema) })

  const pwForm = useForm({ resolver: zodResolver(passwordSchema) })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await staffApi.getProfile()
      const p = unwrapApiData(res) as Record<string, unknown>
      reset({
        name: p?.name ?? '',
        phoneNumber: p?.phoneNumber ?? '',
        address: p?.address ?? '',
      })
    } catch (e) {
      console.error('Failed to load profile:', e)
    } finally {
      setLoading(false)
    }
  }, [reset])

  useEffect(() => {
    load()
  }, [load])

  const saveProfile = async (values) => {
    try {
      const res = await staffApi.updateProfile(values)
      const p = unwrapApiData(res)
      await load()
      if (p && typeof p === 'object') {
        updateUser({
          name: p.name,
          phoneNumber: p.phoneNumber,
          address: p.address,
        })
      } else {
        updateUser({
          name: values.name,
          phoneNumber: values.phoneNumber,
          address: values.address,
        })
      }
      toast.success(t('common.saved'))
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? e?.message ?? t('common.requestFailed'))
    }
  }

  const changePassword = async (values) => {
    try {
      await staffApi.changePassword(values)
      pwForm.reset()
      toast.success(t('staff.profilePage.passwordUpdated'))
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? e?.message ?? t('common.requestFailed'))
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>{t('staff.profile')}</CardTitle>
            <div className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{t('staff.profilePage.subtitle')}</div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(saveProfile)} className="space-y-4">
              {loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-11 w-full" />
                  <Skeleton className="h-11 w-full" />
                  <Skeleton className="h-11 w-full" />
                </div>
              ) : (
                <>
                  <div>
                    <label className="text-xs font-bold text-zinc-600 dark:text-zinc-300">{t('staff.profilePage.name')}</label>
                    <Input {...register('name')} className="mt-2" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-zinc-600 dark:text-zinc-300">{t('staff.profilePage.phone')}</label>
                    <Input {...register('phoneNumber')} className="mt-2" inputMode="tel" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-zinc-600 dark:text-zinc-300">{t('staff.profilePage.address')}</label>
                    <Input {...register('address')} className="mt-2" />
                  </div>
                </>
              )}

              <Button type="submit" disabled={isSubmitting || loading} className="w-full sm:w-auto">
                {isSubmitting ? <Spinner size="sm" className="border-white/40 border-t-white" /> : null}
                {isSubmitting ? t('common.saving') : t('common.save')}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('staff.profilePage.changePasswordTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={pwForm.handleSubmit(changePassword)} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-zinc-600 dark:text-zinc-300">{t('staff.profilePage.currentPassword')}</label>
                <Input type="password" {...pwForm.register('currentPassword')} className="mt-2" autoComplete="current-password" />
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-600 dark:text-zinc-300">{t('staff.profilePage.newPassword')}</label>
                <Input type="password" {...pwForm.register('newPassword')} className="mt-2" autoComplete="new-password" />
              </div>
              <Button type="submit" disabled={pwForm.formState.isSubmitting} className="w-full sm:w-auto">
                {pwForm.formState.isSubmitting ? <Spinner size="sm" className="border-white/40 border-t-white" /> : null}
                {pwForm.formState.isSubmitting ? t('common.updating') : t('staff.profilePage.updatePassword')}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

