import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { PrivateRoute } from '@/routes/PrivateRoute'
import { StaffLayout } from '@/layouts/StaffLayout'
import { Spinner } from '@/components/ui/Spinner'

const LoginPage = lazy(() => import('@/pages/auth/LoginPage').then((m) => ({ default: m.LoginPage })))
const StaffDashboardPage = lazy(() =>
  import('@/pages/staff/StaffDashboardPage').then((m) => ({ default: m.StaffDashboardPage })),
)
const StaffOrdersPage = lazy(() => import('@/pages/staff/StaffOrdersPage').then((m) => ({ default: m.StaffOrdersPage })))
const StaffChatPage = lazy(() => import('@/pages/staff/StaffChatPage').then((m) => ({ default: m.StaffChatPage })))
const StaffAdminMessagesPage = lazy(() =>
  import('@/pages/staff/StaffAdminMessagesPage').then((m) => ({ default: m.StaffAdminMessagesPage })),
)
const StaffVouchersPage = lazy(() => import('@/pages/staff/StaffVouchersPage').then((m) => ({ default: m.StaffVouchersPage })))
const StaffEmailPage = lazy(() => import('@/pages/staff/StaffEmailPage').then((m) => ({ default: m.StaffEmailPage })))
const StaffProfilePage = lazy(() => import('@/pages/staff/StaffProfilePage').then((m) => ({ default: m.StaffProfilePage })))

export const App = () => {
  return (
    <BrowserRouter>
      <Suspense
        fallback={
          <div className="min-h-screen grid place-items-center bg-zinc-50 dark:bg-zinc-950">
            <Spinner size="lg" />
          </div>
        }
      >
        <Routes>
          <Route path="/" element={<Navigate to="/staff/dashboard" replace />} />
          <Route path="/login" element={<LoginPage />} />

          <Route element={<PrivateRoute />}>
            <Route element={<StaffLayout />}>
              <Route path="/staff/dashboard" element={<StaffDashboardPage />} />
              <Route path="/staff/orders" element={<StaffOrdersPage />} />
              <Route path="/staff/chat" element={<StaffChatPage />} />
              <Route path="/staff/messages-admin" element={<StaffAdminMessagesPage />} />
              <Route path="/staff/vouchers" element={<StaffVouchersPage />} />
              <Route path="/staff/email" element={<StaffEmailPage />} />
              <Route path="/staff/profile" element={<StaffProfilePage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/staff/dashboard" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App
