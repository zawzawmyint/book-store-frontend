import { serverDate } from '../../lib/format'
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
  return (
    <section className="mt-8">
      <h2 className="font-serif text-2xl">Request progress</h2>
      <ol className="mt-4 space-y-4">
        {history.map((event) => (
          <li key={event.id} className="border-l-2 border-border pl-4">
            <p className="font-semibold">{orderStatusLabels[event.toStatus]}</p>
            <time
              className="text-sm text-muted-foreground"
              dateTime={serverDate(event.createdAt).toISOString()}
            >
              {serverDate(event.createdAt).toLocaleString()}
            </time>
            {event.toStatus === 'COMPLETED' && (
              <p className="text-sm">Request handling finished. Delivery is not integrated.</p>
            )}
            {event.cancellationReason && (
              <p className="mt-2 whitespace-pre-wrap break-words">
                Reason: {event.cancellationReason}
              </p>
            )}
            {attributed && (
              <p className="text-sm">
                {event.actorType === 'SYSTEM' ? 'System' : event.actorName}
                {event.actorRole && ' · Recorded role: '}
                {event.actorRole?.[0]}
                {event.actorRole?.slice(1).toLowerCase()}
              </p>
            )}
          </li>
        ))}
      </ol>
    </section>
  )
}
