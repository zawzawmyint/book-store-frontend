import { Link } from 'react-router-dom'
import type { QuoteCheckoutQuery } from '../../../generated/graphql'
import type { DeliveryAddress } from '../delivery-address'
import { DeliveryDetails } from '../../orders/DeliveryDetails'
import { Button } from '../../../app/components/ui/button'

type CheckoutReviewProps = {
  quote: QuoteCheckoutQuery['quoteCheckout']
  address: DeliveryAddress
  paymentLoading: boolean
  onEditAddress: () => void
  onContinuePayment: () => void
}

export function CheckoutReview({
  quote,
  address,
  paymentLoading,
  onEditAddress,
  onContinuePayment,
}: CheckoutReviewProps) {
  return (
    <section className="mt-8 space-y-5" aria-label="Reviewed order">
      <h2 className="font-semibold">Review your order</h2>
      <DeliveryDetails
        delivery={{
          address: address,
          shipment: null,
          shippedAt: null,
          deliveredAt: null,
        }}
        subtotalCents={quote.subtotalCents}
        deliveryFeeCents={quote.deliveryFeeCents}
        totalCents={quote.totalCents}
        status="SUBMITTED"
      />
      <p className="text-sm">Review is not a reservation or delivery date guarantee.</p>
      <div className="grid gap-3 sm:flex sm:flex-wrap">
        <Button
          className="min-h-11 sm:min-h-9"
          variant="ghost"
          disabled={paymentLoading}
          onClick={onEditAddress}
        >
          Edit address
        </Button>
        <Button className="min-h-11 sm:min-h-9" asChild variant="ghost">
          <Link to="/cart">Edit cart</Link>
        </Button>
        <Button
          className="min-h-11 sm:min-h-9"
          disabled={paymentLoading}
          onClick={onContinuePayment}
        >
          Continue to payment
        </Button>
      </div>
    </section>
  )
}
