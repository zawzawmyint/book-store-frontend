import { Button } from '../../../app/components/ui/button'
import { Alert, AlertDescription } from '../../../app/components/ui/alert'
import { Skeleton } from '../../../app/components/ui/skeleton'
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
  if (loading)
    return (
      <div role="status" aria-label="Loading" className="space-y-3 py-8">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-10 w-full" />
        <span className="sr-only">Loading…</span>
      </div>
    )
  if (error)
    return (
      <Alert role="alert" variant="destructive" className="my-6 space-y-3">
        <AlertDescription>{error.message}</AlertDescription>
        <Button
          variant="ghost"
          onClick={() => {
            void retry()
          }}
        >
          Retry
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
  const offset = (page - 1) * ADMIN_PAGE_SIZE
  const start = itemCount ? offset + 1 : 0
  const end = itemCount ? Math.min(total, offset + itemCount) : 0
  return (
    <nav aria-label="Pagination" className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <span className="text-sm text-slate-500">
        Showing {start}–{end} of {total} {label}
      </span>
      <div className="flex items-center gap-3">
        <Button variant="outline" disabled={page <= 1} onClick={() => change(page - 1)}>
          Previous
        </Button>
        <span className="text-xs text-slate-500">
          Page {page} of {Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE))}
        </span>
        <Button
          variant="outline"
          disabled={page * ADMIN_PAGE_SIZE >= total}
          onClick={() => change(page + 1)}
        >
          Next
        </Button>
      </div>
    </nav>
  )
}
