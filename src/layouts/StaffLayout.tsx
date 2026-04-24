import React from 'react'
import { NavLink, Outlet, useNavigate, useLocation, type NavLinkRenderProps } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Moon,
  Sun,
  LogOut,
  LayoutDashboard,
  MessageSquare,
  Ticket,
  Mail,
  UserCircle,
  Package,
  Shield,
  Menu,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/store/authStore'
import { useThemeStore } from '@/store/themeStore'
import { useSidebarStore } from '@/store/sidebarStore'
import { disconnectSocket } from '@/services/socket/socketClient'
import { pageTransition } from '@/components/animations/variants'
import { cn } from '@/utils/cn'
import { NotificationBell } from '@/components/notifications/NotificationBell'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { ToastHost } from '@/components/ui/ToastHost'

const MotionAside = motion.aside
const MotionButton = motion.button
const MotionDiv = motion.div

const navLinkClass = ({ isActive }: NavLinkRenderProps, collapsed: boolean) =>
  [
    'flex items-center rounded-2xl text-sm font-semibold transition-all duration-200 relative',
    collapsed ? 'justify-center px-2 py-3 w-full' : 'gap-3 px-4 py-3',
    isActive
      ? collapsed
        ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20'
        : 'bg-brand-600 text-white shadow-md shadow-brand-500/20'
      : collapsed
        ? 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800/60'
        : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800/60',
  ].join(' ')

const NAV_ITEMS = [
  { to: '/staff/dashboard', Icon: LayoutDashboard, labelKey: 'staff.dashboard' },
  { to: '/staff/orders', Icon: Package, labelKey: 'staff.orders' },
  { to: '/staff/chat', Icon: MessageSquare, labelKey: 'staff.chat' },
  { to: '/staff/messages-admin', Icon: Shield, labelKey: 'staff.adminMessages' },
  { to: '/staff/vouchers', Icon: Ticket, labelKey: 'staff.vouchers' },
  { to: '/staff/email', Icon: Mail, labelKey: 'staff.email' },
  { to: '/staff/profile', Icon: UserCircle, labelKey: 'staff.profile' },
]

export const StaffLayout = () => {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { user, clearSession } = useAuthStore()
  const { dark, toggle } = useThemeStore()
  const { collapsed, toggle: toggleSidebar, mobileOpen, openMobile, closeMobile } = useSidebarStore()

  const activeNav = React.useMemo(() => {
    const path = location.pathname
    // Prefer longest match so `/staff/messages-admin` wins over `/staff`
    const items = [...NAV_ITEMS].sort((a, b) => b.to.length - a.to.length)
    return items.find((x) => path === x.to || path.startsWith(`${x.to}/`)) ?? null
  }, [location.pathname])

  const onLogout = () => {
    disconnectSocket()
    clearSession()
    navigate('/login', { replace: true })
  }

  const sidebarHeader = (
    <div className={cn('border-b border-zinc-200/70 dark:border-zinc-800 shrink-0', collapsed ? 'px-2 py-4' : 'px-6 py-6')}>
      <div className={cn('flex items-center', collapsed ? 'flex-col gap-4 items-center' : 'justify-between gap-2')}>
        {!collapsed ? (
          <div className="min-w-0">
            <div className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-brand-600 dark:text-brand-400 truncate">
              {t('staff.portalTitle')}
            </div>
            <div className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
              {t('staff.portalSubtitle')}
            </div>
          </div>
        ) : null}
        <MotionButton
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          type="button"
          onClick={toggleSidebar}
          aria-expanded={!collapsed}
          aria-label={collapsed ? t('common.sidebarExpand') : t('common.sidebarCollapse')}
          title={collapsed ? t('common.sidebarExpand') : t('common.sidebarCollapse')}
          className="shrink-0 rounded-xl border border-zinc-200/70 dark:border-zinc-800 p-2 text-zinc-600 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800/60 transition-colors"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </MotionButton>
      </div>
      <div className={cn('mt-4 flex items-center gap-3', collapsed ? 'flex-col justify-center mt-5' : '')}>
        <div className="h-10 w-10 shrink-0 rounded-full bg-linear-to-tr from-brand-500 to-accent-500 flex items-center justify-center text-white font-bold shadow-lg">
          {user?.name?.[0] || 'S'}
        </div>
        {!collapsed ? (
          <div className="flex-1 min-w-0 overflow-hidden">
            <div className="text-sm font-extrabold truncate">{user?.name ?? t('staff.userFallback')}</div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{t('common.online')}</div>
          </div>
        ) : (
          <span className="sr-only">
            {t('staff.srUserOnline', { name: user?.name ?? t('staff.userFallback') })}
          </span>
        )}
      </div>
    </div>
  )

  const sidebarNav = (
    <nav className={cn('p-4 space-y-2 flex-1 overflow-y-auto', collapsed ? 'px-2' : '')}>
      {NAV_ITEMS.map(({ to, Icon, labelKey }) => (
        <NavLink key={to} to={to} title={collapsed ? t(labelKey) : undefined} className={(state) => navLinkClass(state, collapsed)}>
          {React.createElement(Icon, { size: 18, className: 'shrink-0' })}
          <span className={collapsed ? 'sr-only' : ''}>{t(labelKey)}</span>
        </NavLink>
      ))}
    </nav>
  )

  return (
    <div className="min-h-screen bg-[#fbf7f3] dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans transition-colors duration-300">
      <div className="flex min-h-screen">
        {/* Desktop sidebar */}
        <MotionAside
          initial={{ x: -280 }}
          animate={{ x: 0, width: collapsed ? 80 : 280 }}
          transition={{ type: 'spring', damping: 28, stiffness: 260 }}
          className="hidden lg:flex shrink-0 overflow-hidden border-r border-zinc-200/60 dark:border-zinc-800 bg-white/82 dark:bg-zinc-900/75 backdrop-blur-xl flex-col"
        >
          {sidebarHeader}
          {sidebarNav}
        </MotionAside>

        {/* Mobile/tablet drawer */}
        <AnimatePresence>
          {mobileOpen ? (
            <motion.div className="lg:hidden fixed inset-0 z-50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <motion.button
                type="button"
                aria-label={t('common.closeSidebar')}
                className="absolute inset-0 bg-black/35 backdrop-blur-[2px]"
                onClick={closeMobile}
              />
              <motion.aside
                initial={{ x: -320 }}
                animate={{ x: 0 }}
                exit={{ x: -320 }}
                transition={{ type: 'spring', stiffness: 320, damping: 32 }}
                className="absolute left-0 top-0 bottom-0 w-[280px] sm:w-[320px] overflow-hidden border-r border-zinc-200/70 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col"
              >
                {/* Force expanded in drawer for usability */}
                <div className="border-b border-zinc-200/70 dark:border-zinc-800 px-6 py-6">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-brand-600 dark:text-brand-400">
                      {t('staff.portalTitle')}
                    </div>
                    <MotionButton
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      type="button"
                      onClick={closeMobile}
                      aria-label={t('common.close')}
                      className="rounded-xl border border-zinc-200/70 dark:border-zinc-800 p-2 text-zinc-600 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800/60 transition-colors"
                    >
                      <ChevronLeft size={18} />
                    </MotionButton>
                  </div>
                  <div className="mt-4 flex items-center gap-3">
                    <div className="h-10 w-10 shrink-0 rounded-full bg-linear-to-tr from-brand-500 to-accent-500 flex items-center justify-center text-white font-bold shadow-lg">
                      {user?.name?.[0] || 'S'}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-extrabold truncate">{user?.name ?? t('staff.userFallback')}</div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{t('common.online')}</div>
                    </div>
                  </div>
                </div>
                <nav className="p-4 space-y-2 flex-1 overflow-y-auto">
                  {NAV_ITEMS.map(({ to, Icon, labelKey }) => (
                    <NavLink
                      key={to}
                      to={to}
                      onClick={closeMobile}
                      className={(state) => navLinkClass(state, false)}
                    >
                      {React.createElement(Icon, { size: 18, className: 'shrink-0' })}
                      <span>{t(labelKey)}</span>
                    </NavLink>
                  ))}
                </nav>
              </motion.aside>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <main className="flex-1 flex flex-col relative overflow-hidden min-w-0">
          <ToastHost />
          <header className="h-16 border-b border-zinc-200/60 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60 backdrop-blur z-10 flex items-center justify-between px-4 sm:px-6 sticky top-0">
            <div className="flex items-center gap-3 min-w-0">
              <MotionButton
                type="button"
                onClick={openMobile}
                aria-label={t('common.openSidebar')}
                className="lg:hidden rounded-xl border border-zinc-200/70 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/40 p-2 text-zinc-600 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800/60 transition-colors"
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
              >
                <Menu size={18} />
              </MotionButton>

              <div className="hidden sm:block min-w-0">
                <div className="text-[11px] font-extrabold tracking-[0.18em] uppercase text-zinc-500 dark:text-zinc-400 truncate">
                  {t('staff.portalTitle')}
                </div>
                <div className="text-base font-black tracking-tight truncate">
                  {activeNav ? t(activeNav.labelKey) : t('staff.dashboard')}
                </div>
              </div>

              <MotionButton
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="button"
                onClick={() => i18n.changeLanguage(i18n.language === 'vi' ? 'en' : 'vi')}
                className="text-xs font-bold px-3 py-2 rounded-xl border border-zinc-200/70 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
              >
                {i18n.language === 'vi' ? 'EN' : 'VI'}
              </MotionButton>
              <MotionButton
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="button"
                onClick={toggle}
                className="flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-xl border border-zinc-200/70 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
              >
                {dark ? <Sun size={16} className="text-yellow-400" /> : <Moon size={16} className="text-zinc-600" />}
                <span className="hidden sm:inline">{dark ? t('common.themeLight') : t('common.themeDark')}</span>
              </MotionButton>
            </div>
            <div className="flex items-center gap-3">
              <NotificationBell />
              <MotionButton
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="button"
                onClick={onLogout}
                className="flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-xl bg-linear-to-r from-brand-600 to-brand-500 text-white shadow-md shadow-brand-500/20 hover:from-brand-700 hover:to-brand-600 transition-all"
              >
                <LogOut size={16} />
                <span className="hidden sm:inline">{t('common.logout')}</span>
              </MotionButton>
            </div>
          </header>

            <div className="flex-1 overflow-y-auto">
            <div className="p-4 sm:p-6 lg:p-8">
              <div className="mx-auto w-full max-w-[1200px]">
            <AnimatePresence mode="wait">
              <MotionDiv
                key={location.pathname}
                initial="initial"
                animate="animate"
                exit="exit"
                variants={pageTransition}
                transition={{ duration: 0.18 }}
                className="h-full"
              >
                <ErrorBoundary title={t('common.loadFailed')}>
                  <Outlet />
                </ErrorBoundary>
              </MotionDiv>
            </AnimatePresence>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
