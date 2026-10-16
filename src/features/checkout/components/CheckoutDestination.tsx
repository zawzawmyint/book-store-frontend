import { countryName, type DeliveryAddress } from '../delivery-address'

export function CheckoutDestination({ address }: { address: DeliveryAddress }) {
  return (
    <div className="border border-border p-5 text-sm leading-6">
      <h3 className="mb-2 font-semibold">Delivery address</h3>
      <p>{address.recipientName}</p>
      <p>{address.phone}</p>
      <p className="break-words">{address.addressLine1}</p>
      {address.addressLine2 && <p className="break-words">{address.addressLine2}</p>}
      <p className="break-words">
        {[address.city, address.region, address.postalCode].filter(Boolean).join(', ')}
      </p>
      <p>{countryName(address.countryCode)}</p>
    </div>
  )
}
