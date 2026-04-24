import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { authApi } from '@/services/api/authApi'
import { useAuthStore } from '@/store/authStore'
import { isStaffRole } from '@/constants/roles'
import { Spinner } from '@/components/ui/Spinner'
import { ArrowRight, ShieldCheck } from 'lucide-react'

const schema = z.object({
  email: z.string().min(1).email(),
  password: z.string().min(1),
})

type LoginForm = z.infer<typeof schema>

export const LoginPage = () => {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { setSession } = useAuthStore()
  const [serverError, setServerError] = useState<string | null>(null)

  // Per requirement: Login page always in English.
  useEffect(() => {
    if (i18n.language !== 'en') i18n.changeLanguage('en')
  }, [i18n])

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema) })

  const onSubmit = async (values: LoginForm) => {
    setServerError(null)
    try {
      const data = await authApi.login(values)
      // Backend wraps payload as { success, message, data: { accessToken, user } }
      const accessToken = data?.data?.accessToken ?? data?.accessToken
      const user = data?.data?.user ?? data?.user
      if (!accessToken || !user) throw new Error('INVALID_LOGIN_RESPONSE')
      if (!isStaffRole(user.roleID)) throw new Error('NOT_STAFF')
      setSession({ accessToken, user })
      navigate('/staff/dashboard', { replace: true })
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        'Login failed'
      setServerError(String(msg))
    }
  }

  return (
    <div className="min-h-screen">
      {/* soft editorial background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle_at_center,rgba(93,95,239,0.22),transparent_60%)]" />
        <div className="absolute -right-40 top-24 h-[560px] w-[560px] rounded-full bg-[radial-gradient(circle_at_center,rgba(192,38,211,0.16),transparent_60%)]" />
        <div className="absolute left-1/2 top-[55%] h-[720px] w-[720px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(67,67,213,0.10),transparent_55%)]" />
      </div>

      <header className="relative z-10 px-6 py-6">
        <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-2xl bg-[linear-gradient(135deg,var(--primary),var(--primary_container))] shadow-[0_18px_42px_-18px_rgba(27,27,35,0.28)]" />
            <div className="leading-tight">
              <div className="text-[15px] font-extrabold tracking-tight text-(--on_background) font-display">
                IndigoCore
              </div>
              <div className="text-[11px] font-semibold tracking-[0.16em] uppercase text-zinc-500">
                Staff Console
              </div>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-[13px] font-semibold text-zinc-500">
            <span className="hover:text-zinc-800 transition-colors">Portal</span>
            <span className="hover:text-zinc-800 transition-colors">Support</span>
            <span className="hover:text-zinc-800 transition-colors">Security</span>
          </nav>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-2 rounded-2xl bg-white/70 px-3 py-2 text-[12px] font-bold text-zinc-700 backdrop-blur-xl">
              <ShieldCheck size={16} className="text-(--primary_container)" />
              Staff Access
            </span>
          </div>
        </div>
      </header>

      <main className="relative z-10 px-6 pb-10">
        <div className="mx-auto grid w-full max-w-[1200px] grid-cols-1 gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          {/* Left hero */}
          <section className="pt-2 lg:pt-0">
            <div className="text-[11px] font-extrabold tracking-[0.18em] uppercase text-(--primary_container)">
              Welcome back
            </div>
            <h1 className="mt-4 text-[40px] leading-[1.05] font-extrabold tracking-tight text-(--on_background) font-display sm:text-[52px] lg:text-[56px]">
              Command your
              <br />
              workspace with{' '}
              <span className="text-transparent bg-clip-text bg-[linear-gradient(135deg,var(--primary),var(--primary_container))]">
                Precision
              </span>
              .
            </h1>
            <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-zinc-600">
              Access the core infrastructure with calm authority—secure, editorial, and designed for high-performance staff operations.
            </p>

            <div className="mt-10 max-w-xl rounded-3xl bg-(--surface_container_low) px-5 py-5 backdrop-blur-xl">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 h-10 w-10 rounded-2xl bg-white/70 backdrop-blur-xl grid place-items-center">
                  <ShieldCheck size={18} className="text-(--primary)" />
                </div>
                <div className="min-w-0">
                  <div className="text-[13px] font-extrabold text-zinc-800 font-display">
                    Enterprise Security
                  </div>
                  <div className="mt-1 text-[12px] leading-relaxed text-zinc-600">
                    Multi-factor authentication enabled by default. Token refresh and secure cookies supported.
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Right central vessel */}
          <section className="flex justify-center lg:justify-end">
            <div className="w-full max-w-[420px] rounded-[28px] bg-(--surface_container_lowest) p-7 sm:p-8 shadow-[0_12px_32px_-4px_rgba(27,27,35,0.06)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[20px] font-extrabold tracking-tight text-(--on_background) font-display">
                    Staff Entry
                  </div>
                  <div className="mt-1 text-[12px] text-zinc-500">
                    Identify yourself to access the console.
                  </div>
                </div>
                <span className="inline-flex items-center gap-2 rounded-2xl bg-(--surface_container) px-3 py-2 text-[10px] font-extrabold tracking-[0.16em] uppercase text-(--primary)">
                  System Online
                </span>
              </div>

              <form className="mt-7 space-y-5" onSubmit={handleSubmit(onSubmit)}>
                {serverError ? (
                  <div className="rounded-2xl bg-red-50 px-4 py-3 text-[12px] font-semibold text-red-700">
                    {serverError}
                  </div>
                ) : null}
                <div>
                  <label className="text-[11px] font-extrabold tracking-[0.18em] uppercase text-zinc-500">
                    {t('auth.email')}
                  </label>
                  <div className="mt-2 rounded-2xl bg-(--surface_container) px-4 py-3 focus-within:outline-2 focus-within:outline-[rgba(67,67,213,0.40)]">
                    <input
                      {...register('email')}
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      placeholder="name@company.com"
                      className="w-full bg-transparent text-[15px] font-semibold text-(--on_background) placeholder:text-zinc-400 outline-none"
                    />
                  </div>
                  {errors.email ? <div className="mt-2 text-xs text-red-500">{t('auth.invalidEmail')}</div> : null}
                </div>

                <div>
                  <div className="flex items-center justify-between gap-3">
                    <label className="text-[11px] font-extrabold tracking-[0.18em] uppercase text-zinc-500">
                      {t('auth.password')}
                    </label>
                    <button
                      type="button"
                      className="text-[11px] font-extrabold text-(--primary_container) hover:text-(--primary) transition-colors"
                    >
                      Forgot?
                    </button>
                  </div>
                  <div className="mt-2 rounded-2xl bg-(--surface_container) px-4 py-3 focus-within:outline-2 focus-within:outline-[rgba(67,67,213,0.40)]">
                    <input
                      {...register('password')}
                      type="password"
                      autoComplete="current-password"
                      placeholder="••••••••"
                      className="w-full bg-transparent text-[15px] font-semibold text-(--on_background) placeholder:text-zinc-400 outline-none"
                    />
                  </div>
                  {errors.password ? <div className="mt-2 text-xs text-red-500">{t('auth.passwordRequired')}</div> : null}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="mt-2 w-full rounded-2xl px-4 py-3.5 text-[14px] font-extrabold text-white shadow-[0_18px_42px_-18px_rgba(27,27,35,0.28)] transition disabled:opacity-60 disabled:cursor-not-allowed bg-[linear-gradient(135deg,var(--primary)_0%,var(--primary_container)_100%)] hover:brightness-[0.98] active:translate-y-[0.5px]"
                >
                  <span className="inline-flex items-center justify-center gap-2">
                    {isSubmitting ? (
                      <>
                        <Spinner size="sm" className="border-white/35 border-t-white" />
                        Signing in…
                      </>
                    ) : (
                      <>
                        {t('auth.signIn')}
                        <ArrowRight size={18} />
                      </>
                    )}
                  </span>
                </button>

                <div className="pt-2 text-center text-[11px] text-zinc-500">
                  Restricted system for authorized staff only.
                </div>
              </form>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}

