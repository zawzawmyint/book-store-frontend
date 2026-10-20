import { formatDateTime, serverDate } from '../../lib/format'
import { localized, t, useI18n } from '../../lib/i18n'
import type { MyOrderQuery } from '../../generated/graphql'
import { orderStatusLabels } from './order-status'
type Event = NonNullable<MyOrderQuery['myOrder']>['history'][number] & {
  actorName?: string
  actorRole?: string | null
  actorType?: string
}
export function OrderTimeline({
  history,
  attributed = false,
}: {
  history: readonly Event[]
  attributed?: boolean
}) {
  useI18n()

  return (
    <section className="mt-8">
      <h2 className="font-serif text-2xl">{t('storefront:requestProgress')}</h2>
      <ol className="mt-4 space-y-4">
        {history.map((event) => (
          <li key={event.id} className="border-s-2 border-border ps-4">
            <p className="font-semibold">{localized(orderStatusLabels[event.toStatus])}</p>
            <time
              className="text-sm text-muted-foreground"
              dateTime={serverDate(event.createdAt).toISOString()}
            >
              {localized(formatDateTime(serverDate(event.createdAt)))}
            </time>
            {event.toStatus === 'DELIVERED' && (
              <p className="text-sm">{t('storefront:staffConfirmedDelivery')}</p>
            )}
            {event.cancellationReason && (
              <p className="mt-2 whitespace-pre-wrap break-words">
                {t('storefront:reasonValue', { value0: event.cancellationReason })}
              </p>
            )}
            {attributed && (
              <p className="text-sm">
                {localized(event.actorType === 'SYSTEM' ? t('common:system') : event.actorName)}
                {localized(event.actorRole && t('storefront:recordedRole'))}
                {localized(event.actorRole?.[0])}
                {localized(event.actorRole?.slice(1).toLowerCase())}
              </p>
            )}
          </li>
        ))}
      </ol>
    </section>
  )
}
