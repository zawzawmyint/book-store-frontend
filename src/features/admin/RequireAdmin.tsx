import type { ReactNode } from 'react'
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom'
import { authClient } from '../../lib/auth-client'
import { signInPath } from '../auth/return-to'
import { useAdminAccess } from './admin-access'
import { Button } from '../../app/components/ui/button'
import { Alert, AlertDescription } from '../../app/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '../../app/components/ui/card'
import { Skeleton } from '../../app/components/ui/skeleton'
import { AdminAccountMenu } from './components/AdminAccountMenu'

function AdminAccessScreen({ children }: { children: ReactNode }) {
  return (
    <div className="admin-workspace min-h-screen">
      <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
        <span className="text-sm font-semibold">The Quiet Shelf admin</span>
        <AdminAccountMenu />
      </header>
      <main className="mx-auto max-w-xl px-4 py-16">{children}</main>
    </div>
  )
}

export function RequireAdmin() {
  const { data: session, isPending } = authClient.useSession()
  const location = useLocation()
  const access = useAdminAccess()
  if (isPending || (access.loading && access.role !== 'ADMIN'))
    return (
      <AdminAccessScreen>
        <div role="status" aria-label="Checking admin access" className="space-y-4">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-24 w-full" />
          <span className="sr-only">Checking admin access…</span>
        </div>
      </AdminAccessScreen>
    )
  if (!session?.user)
    return <Navigate replace to={signInPath(`${location.pathname}${location.search}`)} />
  if (access.expired)
    return (
      <AdminAccessScreen>
        <Alert role="alert" className="mb-4">
          <AlertDescription>
            Your session has expired. Refreshing your account session…
          </AlertDescription>
        </Alert>
        <Button onClick={access.retry}>Retry session refresh</Button>
      </AdminAccessScreen>
    )
  if (access.error)
    return (
      <AdminAccessScreen>
        <Alert role="alert" variant="destructive" className="mb-4">
          <AlertDescription>Unable to check admin access. {access.error.message}</AlertDescription>
        </Alert>
        <Button onClick={access.retry}>Retry access check</Button>
      </AdminAccessScreen>
    )
  if (access.role !== 'ADMIN')
    return (
      <AdminAccessScreen>
        <Card>
          <CardHeader>
            <CardTitle>Access denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">This account does not have admin access.</p>
            <Button asChild variant="ghost">
              <Link to="/">Back to store</Link>
            </Button>
          </CardContent>
        </Card>
      </AdminAccessScreen>
    )
  return <Outlet />
}
