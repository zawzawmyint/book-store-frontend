import { Link } from 'react-router-dom'
import { History } from 'lucide-react'
import { IconAction } from '../../../app/components/IconAction'
import type { ActivityEventFieldsFragment } from '../../../generated/graphql'
import { TableCell } from '../../../app/components/ui/table'
import { AdminPageTable } from './AdminPageTable'
import { activityActions, activityFields, activityValue, validBookId } from '../activity-data'

export function ActivityTable({
  items,
  total,
  page,
  onPageChange,
  bookHistory = false,
}: {
  items: readonly ActivityEventFieldsFragment[]
  total: number
  page: number
  onPageChange: (page: number) => void
  bookHistory?: boolean
}) {
  return (
    <>
      <AdminPageTable
        columns={[
          { label: 'Time' },
          { label: 'Actor' },
          { label: 'Action' },
          { label: 'Target' },
          { label: 'Details' },
        ]}
        items={items}
        rowKey={(event) => event.id}
        label="activity events"
        emptyMessage="No activity recorded yet"
        page={page}
        total={total}
        onPageChange={onPageChange}
        tableClassName="min-w-[760px]"
        renderRow={(event) => (
          <>
            <TableCell>
              <time dateTime={event.createdAt}>{new Date(event.createdAt).toLocaleString()}</time>
            </TableCell>
            <TableCell>
              <span className="break-words">
                {event.source === 'OPERATOR' ? 'Operator command' : event.actorName}
              </span>
              {event.source !== 'OPERATOR' && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Recorded role: {activityValue('ROLE', event.actorRole)}
                </p>
              )}
            </TableCell>
            <TableCell>{activityActions[event.action] ?? 'Unknown action'}</TableCell>
            <TableCell>
              <span className="break-words">{event.targetName}</span>
              <p className="text-xs text-muted-foreground">
                {event.targetType === 'BOOK'
                  ? 'Book'
                  : event.targetType === 'ORDER'
                    ? 'Order request'
                    : 'User'}{' '}
                #{event.targetId}
              </p>
              {event.targetType === 'ORDER' && validBookId(event.targetId) && (
                <Link className="text-primary underline" to={`/admin/orders/${event.targetId}`}>
                  View order request
                </Link>
              )}
              {!bookHistory && event.targetType === 'BOOK' && validBookId(event.targetId) && (
                <IconAction
                  asChild
                  label="Book history"
                  tooltip={`History for ${event.targetName}`}
                  workspace
                >
                  <Link to={`/admin/books/${event.targetId}/history`}>
                    <History aria-hidden="true" />
                  </Link>
                </IconAction>
              )}
            </TableCell>
            <TableCell>
              {event.changes.length > 0 ? (
                <details className="max-w-md">
                  <summary className="cursor-pointer rounded focus-visible:outline-2">
                    View changes
                  </summary>
                  <dl className="mt-3 space-y-4">
                    {event.changes.map((change) => (
                      <div key={change.field}>
                        <dt className="font-semibold">
                          {activityFields[change.field] ?? 'Changed field'}
                        </dt>
                        <dd className="mt-1 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                          Previous: {activityValue(change.field, change.before)}
                        </dd>
                        <dd className="mt-1 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                          New: {activityValue(change.field, change.after)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  {event.stockDelta != null && (
                    <p className="mt-3">
                      Stock delta: {event.stockDelta > 0 ? '+' : ''}
                      {event.stockDelta}
                    </p>
                  )}
                </details>
              ) : (
                <span className="text-muted-foreground">No field changes</span>
              )}
            </TableCell>
          </>
        )}
      />
      {total === 0 && (
        <p className="mt-3 text-sm text-muted-foreground">
          Earlier changes were not captured. Activity starts when history recording was enabled.
        </p>
      )}
    </>
  )
}
