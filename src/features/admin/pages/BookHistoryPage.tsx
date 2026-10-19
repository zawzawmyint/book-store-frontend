import { localized, t, useI18n } from '../../../lib/i18n'
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
  useI18n()

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
        {t('admin:backToBooks')}
      </Link>
      <AdminPageHeader
        title={t('admin:bookHistory')}
        description={t('admin:recordedChangesForValueTimesUseYourLocalTimezoneValue', {
          value0: events?.items[0]?.targetName ?? t('admin:bookIdentifier', { value0: id }),
          value1: Intl.DateTimeFormat().resolvedOptions().timeZone,
        })}
      />
      {invalid ? (
        <Alert role="alert" variant="destructive">
          <AlertDescription>{t('admin:enterAValidBookId')}</AlertDescription>
        </Alert>
      ) : (
        <AdminFeedback loading={loading} error={localized(error)} retry={refetch} />
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
