import { Button } from '../../../app/components/ui/button'
import { Alert, AlertDescription } from '../../../app/components/ui/alert'
import { Skeleton } from '../../../app/components/ui/skeleton'

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
}: {
  page: number
  total: number
  change: (page: number) => void
}) {
  return (
    <nav aria-label="Pagination" className="mt-6 flex items-center justify-between gap-3">
      <Button variant="ghost" disabled={page <= 1} onClick={() => change(page - 1)}>
        Previous
      </Button>
      <span className="text-sm">
        Page {page} of {Math.max(1, Math.ceil(total / 20))}
      </span>
      <Button variant="ghost" disabled={page * 20 >= total} onClick={() => change(page + 1)}>
        Next
      </Button>
    </nav>
  )
}
