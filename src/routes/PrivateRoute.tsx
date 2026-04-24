import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { isStaffRole } from '@/constants/roles'

export const PrivateRoute = () => {
  const location = useLocation()
  const { isAuthenticated, user } = useAuthStore()

  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />
  if (!isStaffRole(user?.roleID)) return <Navigate to="/" replace />
  return <Outlet />
}

