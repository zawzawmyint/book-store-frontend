import { Link } from 'react-router-dom'
import type { QuoteCheckoutQuery } from '../../../generated/graphql'
import type { DeliveryAddress } from '../delivery-address'
import { CheckoutDestination } from './CheckoutDestination'
import { CheckoutTotals } from './CheckoutSummary'
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
    <section className="space-y-6" aria-label="Reviewed order">
      <h2 className="font-serif text-2xl">Review your order</h2>
      <CheckoutDestination address={address} />
      <CheckoutTotals amounts={quote} />
      <p className="text-xs leading-5 text-muted-foreground">
        Review is not a reservation or delivery date guarantee.
      </p>
      <Button className="min-h-11 w-full" disabled={paymentLoading} onClick={onContinuePayment}>
        {paymentLoading ? 'Opening payment…' : 'Continue to payment'}
      </Button>
      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
        <Button
          className="min-h-11 px-3 text-sm underline underline-offset-4"
          variant="ghost"
          disabled={paymentLoading}
          onClick={onEditAddress}
        >
          Edit address
        </Button>
        {paymentLoading ? (
          <Button className="min-h-11 px-3 text-sm" variant="ghost" disabled>
            Edit bag
          </Button>
        ) : (
          <Button
            className="min-h-11 px-3 text-sm underline underline-offset-4"
            asChild
            variant="ghost"
          >
            <Link to="/cart">Edit bag</Link>
          </Button>
        )}
      </div>
    </section>
  )
}
