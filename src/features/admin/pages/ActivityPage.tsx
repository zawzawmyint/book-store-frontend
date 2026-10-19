import { localized, t, useI18n } from '../../../lib/i18n'
import { useState } from 'react'
import { useQuery } from '@apollo/client/react'
import { AdminActivityDocument } from '../../../generated/graphql'
import { Button } from '../../../app/components/ui/button'
import { Input } from '../../../app/components/ui/input'
import { Label } from '../../../app/components/ui/label'
import { Checkbox } from '../../../app/components/ui/checkbox'
import { Alert, AlertDescription } from '../../../app/components/ui/alert'
import { AdminPageHeader } from '../components/AdminPageHeader'
import { AdminFeedback } from '../components/AdminFeedback'
import { ActivityTable } from '../components/ActivityTable'
import { useAdminPagination, useAdminPageCorrection } from '../use-admin-pagination'
import { activityActions, readActivityFilters } from '../activity-data'
import { useAdminQueryError } from '../admin-access'

export function ActivityPage() {
  useI18n()

  const { params, setParams, page, limit, offset, changePage } = useAdminPagination()
  const filters = readActivityFilters(params)
  const [validation, setValidation] = useState('')
  const { data, loading, error, refetch } = useQuery(AdminActivityDocument, {
    variables: {
      ...filters.variables,
      limit,
      offset,
    },
    skip: !!filters.error,
    fetchPolicy: 'no-cache',
  })
  useAdminQueryError(error)
  const events = data?.adminActivity
  useAdminPageCorrection({ total: events?.total, loading, enabled: !filters.error })
  return (
    <section>
      <AdminPageHeader
        title={t('admin:activity')}
        description={t('admin:storeChangesNewestFirstTimesAndDateFiltersUseYourLocal', {
          value0: Intl.DateTimeFormat().resolvedOptions().timeZone,
        })}
      />
      <form
        key={params.toString()}
        className="admin-toolbar"
        aria-label={t('admin:activityFilters')}
        onSubmit={(event) => {
          event.preventDefault()
          const values = new FormData(event.currentTarget)
          const next = new URLSearchParams()
          for (const key of ['actorUserId', 'action', 'from', 'to']) {
            const value = String(values.get(key) ?? '').trim()
            if (value) next.set(key, value)
          }
          if (values.get('priceOnly') === 'on') next.set('changedField', 'PRICE_CENTS')
          const failure = readActivityFilters(next).error
          setValidation(failure)
          if (!failure) setParams(next)
        }}
      >
        <div className="admin-toolbar-field">
          <Label htmlFor="activity-actor">{t('admin:actorUserId')}</Label>
          <Input
            id="activity-actor"
            name="actorUserId"
            defaultValue={filters.actorUserId}
            maxLength={256}
          />
        </div>
        <div className="admin-toolbar-field">
          <Label htmlFor="activity-action">{t('admin:action')}</Label>
          <select
            id="activity-action"
            name="action"
            defaultValue={filters.action}
            className="h-10 rounded-md border border-control bg-input px-3 text-sm"
          >
            <option value="">{t('admin:allActions')}</option>
            {Object.entries(activityActions).map(([value, label]) => (
              <option key={value} value={value}>
                {localized(label)}
              </option>
            ))}
          </select>
        </div>
        <div className="admin-toolbar-field">
          <Label htmlFor="activity-from">{t('admin:fromDate')}</Label>
          <Input id="activity-from" name="from" type="date" defaultValue={filters.from} />
        </div>
        <div className="admin-toolbar-field">
          <Label htmlFor="activity-to">{t('admin:toDate')}</Label>
          <Input id="activity-to" name="to" type="date" defaultValue={filters.to} />
        </div>
        <div className="admin-toolbar-toggle">
          <Checkbox
            id="activity-price"
            name="priceOnly"
            defaultChecked={params.get('changedField') === 'PRICE_CENTS'}
          />
          <Label htmlFor="activity-price">{t('admin:priceChangesOnly')}</Label>
        </div>
        <Button type="submit" variant="outline">
          {t('admin:applyFilters')}
        </Button>
      </form>
      {(validation || filters.error) && (
        <Alert role="alert" variant="destructive" className="my-4">
          <AlertDescription>{localized(validation || filters.error)}</AlertDescription>
        </Alert>
      )}
      {!filters.error && (
        <AdminFeedback loading={loading} error={localized(error)} retry={refetch} />
      )}
      {!filters.error && !loading && !error && events && (
        <ActivityTable
          items={events.items}
          total={events.total}
          page={page}
          onPageChange={changePage}
        />
      )}
    </section>
  )
}
