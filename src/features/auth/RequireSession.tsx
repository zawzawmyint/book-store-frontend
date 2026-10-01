import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { authClient } from '../../lib/auth-client'
import { signInPath } from './return-to'

export function RequireSession() {
  const { data, isPending } = authClient.useSession()
  const location = useLocation()
  if (isPending) return <div role="status" className="py-24 text-center">Loading your account…</div>
  if (!data?.user) return <Navigate to={signInPath(`${location.pathname}${location.search}${location.hash}`)} replace />
  return <Outlet />
}
