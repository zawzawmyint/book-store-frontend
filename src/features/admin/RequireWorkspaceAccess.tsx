import { errorMessage } from '../../lib/i18n/errors'
import { localized, t, useI18n } from '../../lib/i18n'
import type { ReactNode } from 'react'
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom'
import { authClient } from '../../lib/auth-client'
import { signInPath } from '../auth/return-to'
import { useAdminAccess } from './admin-access'
import { Button } from '../../app/components/ui/button'
import { Alert, AlertDescription } from '../../app/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '../../app/components/ui/card'
import { Skeleton } from '../../app/components/ui/skeleton'
import { BookLoader } from '../../app/components/BookLoader'
import { AdminAccountMenu } from './components/AdminAccountMenu'

function AdminAccessScreen({ children }: { children: ReactNode }) {
  useI18n()

  return (
    <div className="admin-workspace min-h-screen">
      <header className="flex h-16 items-center justify-between gap-3 border-b border-border bg-surface px-4 sm:px-6">
        <span className="min-w-0 truncate text-sm font-semibold">
          {t('admin:theQuietShelfAdmin')}
        </span>
        <div className="flex shrink-0 items-center gap-2">
          <AdminAccountMenu />
        </div>
      </header>
      <main className="mx-auto max-w-xl px-4 py-16">{localized(children)}</main>
    </div>
  )
}

export function RequireWorkspaceAccess({ adminOnly = false }: { adminOnly?: boolean }) {
  useI18n()

  const { data: session, isPending } = authClient.useSession()
  const location = useLocation()
  const access = useAdminAccess()
  const permitted = access.role === 'ADMIN' || (!adminOnly && access.role === 'STAFF')
  if (!isPending && session?.user.emailVerified !== true)
    return <Navigate replace to={signInPath(`${location.pathname}${location.search}`)} />
  if (isPending || (access.loading && !permitted))
    return (
      <AdminAccessScreen>
        <div className="space-y-4">
          <BookLoader label={t('admin:checkingAdminAccess')} />
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-24 w-full" />
        </div>
      </AdminAccessScreen>
    )
  if (session?.user.emailVerified !== true)
    return <Navigate replace to={signInPath(`${location.pathname}${location.search}`)} />
  if (access.expired)
    return (
      <AdminAccessScreen>
        <Alert role="alert" className="mb-4">
          <AlertDescription>
            {t('admin:yourSessionHasExpiredRefreshingYourAccountSession')}
          </AlertDescription>
        </Alert>
        <Button onClick={access.retry}>{t('admin:retrySessionRefresh')}</Button>
      </AdminAccessScreen>
    )
  if (access.error)
    return (
      <AdminAccessScreen>
        <Alert role="alert" variant="destructive" className="mb-4">
          <AlertDescription>
            {t('admin:unableToCheckAdminAccessValue', {
              value0: errorMessage(access.error, 'common:requestFailed'),
            })}
          </AlertDescription>
        </Alert>
        <Button onClick={access.retry}>{t('admin:retryAccessCheck')}</Button>
      </AdminAccessScreen>
    )
  if (!permitted)
    return (
      <AdminAccessScreen>
        <Card>
          <CardHeader>
            <CardTitle>{t('admin:accessDenied')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">{t('admin:thisAccountDoesNotHaveAdminAccess')}</p>
            <Button asChild variant="ghost">
              <Link to="/">{t('admin:backToStore')}</Link>
            </Button>
          </CardContent>
        </Card>
      </AdminAccessScreen>
    )
  return <Outlet />
}
