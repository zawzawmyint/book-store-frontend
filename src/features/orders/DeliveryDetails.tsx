import { safeTrackingUrl } from './tracking-url'
import type { CustomerOrderFieldsFragment } from '../../generated/graphql'
import { money, serverDate } from '../../lib/format'
export function DeliveryDetails({
  delivery,
  subtotalCents,
  deliveryFeeCents,
  totalCents,
  status,
}: Pick<
  CustomerOrderFieldsFragment,
  'delivery' | 'subtotalCents' | 'deliveryFeeCents' | 'totalCents' | 'status'
>) {
  const address = delivery.address
  const shipment = delivery.shipment
  return (
    <section className="mt-6 space-y-4 text-left" aria-label="Delivery details">
      <dl className="space-y-2">
        <div className="flex justify-between">
          <dt>Books subtotal</dt>
          <dd>{money(subtotalCents)}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Delivery</dt>
          <dd>{deliveryFeeCents === 0 ? 'Free delivery' : money(deliveryFeeCents)}</dd>
        </div>
        <div className="flex justify-between font-semibold">
          <dt>Total</dt>
          <dd>{money(totalCents)}</dd>
        </div>
      </dl>
      <div>
        <h2 className="font-semibold">Delivery address</h2>
        <p>{address.recipientName}</p>
        <p>{address.phone}</p>
        <p>{address.addressLine1}</p>
        {address.addressLine2 && <p>{address.addressLine2}</p>}
        <p>{[address.city, address.region, address.postalCode].filter(Boolean).join(', ')}</p>
        <p>{address.countryCode}</p>
      </div>
      {shipment ? (
        <div>
          <p>{shipment.carrier}</p>
          {shipment.trackingNumber && <p>{shipment.trackingNumber}</p>}
          {shipment.trackingUrl && safeTrackingUrl(shipment.trackingUrl) && (
            <a
              className="text-primary underline"
              href={shipment.trackingUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Track with carrier
            </a>
          )}
          <p className="text-xs text-muted-foreground">
            Tracking details are entered by staff. The carrier page provides its own updates.
          </p>
        </div>
      ) : (
        ['SHIPPED', 'DELIVERED'].includes(status) && <p>Tracking details not provided</p>
      )}
      {delivery.shippedAt && <p>Shipped {serverDate(delivery.shippedAt).toLocaleString()}</p>}
      {delivery.deliveredAt && (
        <p>Delivery confirmed {serverDate(delivery.deliveredAt).toLocaleString()}</p>
      )}
    </section>
  )
}
