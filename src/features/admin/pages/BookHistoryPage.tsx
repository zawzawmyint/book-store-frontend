import { useQuery } from '@apollo/client/react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { AdminActivityDocument } from '../../../generated/graphql'
import { Alert, AlertDescription } from '../../../app/components/ui/alert'
import { AdminPageHeader } from '../components/AdminPageHeader'
import { AdminFeedback } from '../components/AdminFeedback'
import { ActivityTable } from '../components/ActivityTable'
import { useAdminPagination, useAdminPageCorrection } from '../use-admin-pagination'
import { booksReturnTo, validBookId } from '../activity-data'
import { useAdminQueryError } from '../admin-access'

export function BookHistoryPage() {
  const { id = '' } = useParams()
  const { params, page, limit, offset, changePage } = useAdminPagination()
  const location = useLocation()
  const returnTo = booksReturnTo(
    params.get('returnTo') ?? (location.state as { returnTo?: unknown } | null)?.returnTo,
  )
  const invalid = !validBookId(id)
  const { data, loading, error, refetch } = useQuery(AdminActivityDocument, {
    variables: {
      targetType: 'BOOK',
      targetId: id,
      limit,
      offset,
    },
    skip: invalid,
    fetchPolicy: 'no-cache',
  })
  useAdminQueryError(error)
  const events = data?.adminActivity
  useAdminPageCorrection({ total: events?.total, loading, enabled: !invalid })
  return (
    <section>
      <Link className="admin-back-link" to={returnTo}>
        Back to books
      </Link>
      <AdminPageHeader
        title="Book history"
        description={`Recorded changes for ${events?.items[0]?.targetName ?? `book #${id}`}. Times use your local timezone (${Intl.DateTimeFormat().resolvedOptions().timeZone}).`}
      />
      {invalid ? (
        <Alert role="alert" variant="destructive">
          <AlertDescription>Enter a valid book ID.</AlertDescription>
        </Alert>
      ) : (
        <AdminFeedback loading={loading} error={error} retry={refetch} />
      )}
      {!invalid && !loading && !error && events && (
        <ActivityTable
          bookHistory
          items={events.items}
          total={events.total}
          page={page}
          onPageChange={changePage}
        />
      )}
    </section>
  )
}
