import { localized, t, useI18n } from '../../../lib/i18n'
import { countryName, type DeliveryAddress } from '../delivery-address'

export function CheckoutDestination({ address }: { address: DeliveryAddress }) {
  useI18n()

  return (
    <div className="border border-border p-5 text-sm leading-6">
      <h3 className="mb-2 font-semibold">{t('storefront:deliveryAddress')}</h3>
      <p>
        <bdi dir="auto">{localized(address.recipientName)}</bdi>
      </p>
      <p>
        <bdi dir="ltr">{localized(address.phone)}</bdi>
      </p>
      <p className="break-words">
        <bdi dir="auto">{localized(address.addressLine1)}</bdi>
      </p>
      {address.addressLine2 && (
        <p className="break-words">
          <bdi dir="auto">{localized(address.addressLine2)}</bdi>
        </p>
      )}
      <p className="break-words">
        <bdi dir="auto">
          {localized([address.city, address.region, address.postalCode].filter(Boolean).join(', '))}
        </bdi>
      </p>
      <p>{localized(countryName(address.countryCode))}</p>
    </div>
  )
}
