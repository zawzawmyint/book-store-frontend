import { formatDateTime } from '../../../lib/format'
import { localized, t, useI18n } from '../../../lib/i18n'
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
  useI18n()

  return (
    <>
      <AdminPageTable
        columns={[
          { label: t('common:labelTime') },
          { label: t('common:labelActor') },
          { label: t('common:labelAction') },
          { label: t('common:labelTarget') },
          { label: t('common:labelDetails') },
        ]}
        items={items}
        rowKey={(event) => event.id}
        label={t('admin:activityEvents')}
        emptyMessage={t('admin:noActivityRecordedYet')}
        page={page}
        total={total}
        onPageChange={onPageChange}
        tableClassName="min-w-[760px]"
        renderRow={(event) => (
          <>
            <TableCell>
              <time dateTime={event.createdAt}>
                {localized(formatDateTime(new Date(event.createdAt)))}
              </time>
            </TableCell>
            <TableCell>
              <span className="break-words">
                {localized(
                  event.source === 'SYSTEM'
                    ? t('common:system')
                    : event.source === 'OPERATOR'
                      ? t('admin:operatorCommand')
                      : event.actorName,
                )}
              </span>
              {event.source !== 'OPERATOR' && event.source !== 'SYSTEM' && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {t('admin:recordedRoleValue', { value0: activityValue('ROLE', event.actorRole) })}
                </p>
              )}
            </TableCell>
            <TableCell>
              {localized(activityActions[event.action] ?? t('admin:unknownAction'))}
            </TableCell>
            <TableCell>
              <span className="break-words">
                <bdi dir="auto">{localized(event.targetName)}</bdi>
              </span>
              <p className="text-xs text-muted-foreground">
                {localized(
                  event.targetType === 'BOOK'
                    ? t('common:labelBook')
                    : event.targetType === 'ORDER'
                      ? t('admin:orderRequest')
                      : t('common:labelUser'),
                )}{' '}
                #<bdi dir="ltr">{localized(event.targetId)}</bdi>
              </p>
              {event.targetType === 'ORDER' && validBookId(event.targetId) && (
                <Link className="text-primary underline" to={`/admin/orders/${event.targetId}`}>
                  {t('admin:viewOrderRequest')}
                </Link>
              )}
              {!bookHistory && event.targetType === 'BOOK' && validBookId(event.targetId) && (
                <IconAction
                  asChild
                  label={t('admin:bookHistory')}
                  tooltip={t('admin:historyForValue', { value0: event.targetName })}
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
                    {t('admin:viewChanges')}
                  </summary>
                  <dl className="mt-3 space-y-4">
                    {event.changes.map((change) => (
                      <div key={change.field}>
                        <dt className="font-semibold">
                          {localized(activityFields[change.field] ?? t('admin:changedField'))}
                        </dt>
                        <dd className="mt-1 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                          {t('admin:previousValue', {
                            value0: activityValue(change.field, change.before),
                          })}
                        </dd>
                        <dd className="mt-1 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                          {t('admin:newValue', {
                            value0: activityValue(change.field, change.after),
                          })}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  {event.stockDelta != null && (
                    <p className="mt-3">
                      {t('admin:stockDeltaValueValue', {
                        value0: event.stockDelta > 0 ? '+' : '',
                        value1: event.stockDelta,
                      })}
                    </p>
                  )}
                </details>
              ) : (
                <span className="text-muted-foreground">{t('admin:noFieldChanges')}</span>
              )}
            </TableCell>
          </>
        )}
      />
      {total === 0 && (
        <p className="mt-3 text-sm text-muted-foreground">
          {t('admin:earlierChangesWereNotCapturedActivityStartsWhenHistoryRecordingWas')}
        </p>
      )}
    </>
  )
}
