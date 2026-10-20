import { formatDateTime, money, serverDate } from '../../lib/format'
import { localized, t, useI18n } from '../../lib/i18n'
import { safeTrackingUrl } from './tracking-url'
import type { CustomerOrderFieldsFragment } from '../../generated/graphql'
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
  useI18n()

  const address = delivery.address
  const shipment = delivery.shipment
  return (
    <section className="mt-6 space-y-4 text-start" aria-label={t('storefront:deliveryDetails')}>
      <dl className="space-y-2">
        <div className="flex justify-between">
          <dt>{t('storefront:booksSubtotal')}</dt>
          <dd>{localized(money(subtotalCents))}</dd>
        </div>
        <div className="flex justify-between">
          <dt>{t('storefront:delivery')}</dt>
          <dd>
            {localized(
              deliveryFeeCents === 0 ? t('storefront:freeDelivery') : money(deliveryFeeCents),
            )}
          </dd>
        </div>
        <div className="flex justify-between font-semibold">
          <dt>{t('storefront:total')}</dt>
          <dd>{localized(money(totalCents))}</dd>
        </div>
      </dl>
      <div>
        <h2 className="font-semibold">{t('storefront:deliveryAddress')}</h2>
        <p>
          <bdi dir="auto">{localized(address.recipientName)}</bdi>
        </p>
        <p>
          <bdi dir="ltr">{localized(address.phone)}</bdi>
        </p>
        <p>
          <bdi dir="auto">{localized(address.addressLine1)}</bdi>
        </p>
        {address.addressLine2 && (
          <p>
            <bdi dir="auto">{localized(address.addressLine2)}</bdi>
          </p>
        )}
        <p>
          <bdi dir="auto">
            {localized(
              [address.city, address.region, address.postalCode].filter(Boolean).join(', '),
            )}
          </bdi>
        </p>
        <p>
          <bdi dir="ltr">{localized(address.countryCode)}</bdi>
        </p>
      </div>
      {shipment ? (
        <div>
          <p>
            <bdi dir="auto">{localized(shipment.carrier)}</bdi>
          </p>
          {shipment.trackingNumber && (
            <p>
              <bdi dir="ltr">{localized(shipment.trackingNumber)}</bdi>
            </p>
          )}
          {shipment.trackingUrl && safeTrackingUrl(shipment.trackingUrl) && (
            <a
              className="text-primary underline"
              href={shipment.trackingUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('storefront:trackWithCarrier')}
            </a>
          )}
          <p className="text-xs text-muted-foreground">
            {t('storefront:trackingDetailsAreEnteredByStaffTheCarrierPageProvidesIts')}
          </p>
        </div>
      ) : (
        ['SHIPPED', 'DELIVERED'].includes(status) && (
          <p>{t('storefront:trackingDetailsNotProvided')}</p>
        )
      )}
      {delivery.shippedAt && (
        <p>
          {t('storefront:shippedValue', { value0: formatDateTime(serverDate(delivery.shippedAt)) })}
        </p>
      )}
      {delivery.deliveredAt && (
        <p>
          {t('storefront:deliveryConfirmedValue', {
            value0: formatDateTime(serverDate(delivery.deliveredAt)),
          })}
        </p>
      )}
    </section>
  )
}
