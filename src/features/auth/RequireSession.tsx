import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { authClient } from '../../lib/auth-client'
import { signInPath } from './return-to'
import { BookLoader } from '../../app/components/BookLoader'

export function RequireSession() {
  const { data, isPending } = authClient.useSession()
  const location = useLocation()
  if (isPending)
    return (
      <BookLoader label="Loading your account…" className="py-24" />
    )
  if (data?.user.emailVerified !== true)
    return (
      <Navigate to={signInPath(`${location.pathname}${location.search}${location.hash}`)} replace />
    )
  return <Outlet />
}
