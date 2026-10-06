import { useEffect, useState } from 'react'
import { useQuery } from '@apollo/client/react'
import { useSearchParams } from 'react-router-dom'
import { AdminActivityDocument } from '../../../generated/graphql'
import { Button } from '../../../app/components/ui/button'
import { Input } from '../../../app/components/ui/input'
import { Label } from '../../../app/components/ui/label'
import { Checkbox } from '../../../app/components/ui/checkbox'
import { Alert, AlertDescription } from '../../../app/components/ui/alert'
import { AdminPageHeader } from '../components/AdminPageHeader'
import { AdminFeedback } from '../components/AdminFeedback'
import { ActivityTable } from '../components/ActivityTable'
import { ADMIN_PAGE_SIZE, readPage } from '../admin-data'
import { activityActions, readActivityFilters } from '../activity-data'
import { useAdminQueryError } from '../admin-access'

export function ActivityPage() {
  const [params, setParams] = useSearchParams()
  const filters = readActivityFilters(params)
  const page = readPage(params.get('page'))
  const [validation, setValidation] = useState('')
  const { data, loading, error, refetch } = useQuery(AdminActivityDocument, {
    variables: {
      ...filters.variables,
      limit: ADMIN_PAGE_SIZE,
      offset: (page - 1) * ADMIN_PAGE_SIZE,
    },
    skip: !!filters.error,
    fetchPolicy: 'no-cache',
  })
  useAdminQueryError(error)
  const events = data?.adminActivity
  useEffect(() => {
    if (
      !filters.error &&
      events &&
      !loading &&
      page > Math.max(1, Math.ceil(events.total / ADMIN_PAGE_SIZE))
    ) {
      const next = new URLSearchParams(params)
      next.set('page', String(Math.max(1, Math.ceil(events.total / ADMIN_PAGE_SIZE))))
      setParams(next, { replace: true })
    }
  }, [events, loading, page, params, setParams, filters.error])
  return (
    <section>
      <AdminPageHeader
        title="Activity"
        description={`Store changes, newest first. Times and date filters use your local timezone (${Intl.DateTimeFormat().resolvedOptions().timeZone}).`}
      />
      <form
        key={params.toString()}
        className="admin-toolbar"
        aria-label="Activity filters"
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
          <Label htmlFor="activity-actor">Actor user ID</Label>
          <Input
            id="activity-actor"
            name="actorUserId"
            defaultValue={filters.actorUserId}
            maxLength={256}
          />
        </div>
        <div className="admin-toolbar-field">
          <Label htmlFor="activity-action">Action</Label>
          <select
            id="activity-action"
            name="action"
            defaultValue={filters.action}
            className="h-10 rounded-md border border-control bg-input px-3 text-sm"
          >
            <option value="">All actions</option>
            {Object.entries(activityActions).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="admin-toolbar-field">
          <Label htmlFor="activity-from">From date</Label>
          <Input id="activity-from" name="from" type="date" defaultValue={filters.from} />
        </div>
        <div className="admin-toolbar-field">
          <Label htmlFor="activity-to">To date</Label>
          <Input id="activity-to" name="to" type="date" defaultValue={filters.to} />
        </div>
        <div className="admin-toolbar-toggle">
          <Checkbox
            id="activity-price"
            name="priceOnly"
            defaultChecked={params.get('changedField') === 'PRICE_CENTS'}
          />
          <Label htmlFor="activity-price">Price changes only</Label>
        </div>
        <Button type="submit" variant="outline">
          Apply filters
        </Button>
      </form>
      {(validation || filters.error) && (
        <Alert role="alert" variant="destructive" className="my-4">
          <AlertDescription>{validation || filters.error}</AlertDescription>
        </Alert>
      )}
      {!filters.error && <AdminFeedback loading={loading} error={error} retry={refetch} />}
      {!filters.error && !loading && !error && events && (
        <ActivityTable
          items={events.items}
          total={events.total}
          page={page}
          onPageChange={(nextPage) => {
            const next = new URLSearchParams(params)
            next.set('page', String(nextPage))
            setParams(next)
          }}
        />
      )}
    </section>
  )
}
