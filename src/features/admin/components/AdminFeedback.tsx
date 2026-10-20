import { errorMessage } from '../../../lib/i18n/errors'
import { localized, t, useI18n } from '../../../lib/i18n'
import { Button } from '../../../app/components/ui/button'
import { Alert, AlertDescription } from '../../../app/components/ui/alert'
import { Skeleton } from '../../../app/components/ui/skeleton'
import { BookLoader } from '../../../app/components/BookLoader'
import { ADMIN_PAGE_SIZE } from '../admin-data'

export function AdminFeedback({
  loading,
  error,
  retry,
}: {
  loading: boolean
  error?: Error
  retry: () => unknown
}) {
  useI18n()

  if (loading)
    return (
      <div className="space-y-3 py-8">
        <BookLoader label={t('admin:loadingWorkspace')} />
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-10 w-full" />
      </div>
    )
  if (error)
    return (
      <Alert role="alert" variant="destructive" className="my-6 space-y-3">
        <AlertDescription>
          {localized(errorMessage(error, 'common:requestFailed'))}
        </AlertDescription>
        <Button
          variant="ghost"
          onClick={() => {
            void retry()
          }}
        >
          {t('admin:retry')}
        </Button>
      </Alert>
    )
  return null
}

export function AdminPagination({
  page,
  total,
  change,
  label,
  itemCount,
}: {
  page: number
  total: number
  label: string
  itemCount: number
  change: (page: number) => void
}) {
  useI18n()

  const offset = (page - 1) * ADMIN_PAGE_SIZE
  const start = itemCount ? offset + 1 : 0
  const end = itemCount ? Math.min(total, offset + itemCount) : 0
  return (
    <nav
      aria-label={t('admin:pagination')}
      className="mt-4 flex flex-wrap items-center justify-between gap-3"
    >
      <span className="text-sm text-muted-foreground" aria-label={label}>
        {t('admin:showingRange', { value0: start, value1: end, value2: total })}
      </span>
      <div className="flex items-center gap-3">
        <Button variant="outline" disabled={page <= 1} onClick={() => change(page - 1)}>
          {t('admin:previous')}
        </Button>
        <span className="text-xs text-muted-foreground">
          {t('admin:pageValueOfValue', {
            value0: page,
            value1: Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE)),
          })}
        </span>
        <Button
          variant="outline"
          disabled={page * ADMIN_PAGE_SIZE >= total}
          onClick={() => change(page + 1)}
        >
          {t('admin:next')}
        </Button>
      </div>
    </nav>
  )
}
