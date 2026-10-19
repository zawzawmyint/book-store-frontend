import { localized, t, useI18n } from '../../../lib/i18n'
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
  useI18n()

  return (
    <section className="space-y-6" aria-label={t('storefront:reviewedOrder')}>
      <h2 className="font-serif text-2xl">{t('storefront:reviewYourOrder')}</h2>
      <CheckoutDestination address={address} />
      <CheckoutTotals amounts={quote} />
      <p className="text-xs leading-5 text-muted-foreground">
        {t('storefront:reviewIsNotAReservationOrDeliveryDateGuarantee')}
      </p>
      <Button className="min-h-11 w-full" disabled={paymentLoading} onClick={onContinuePayment}>
        {localized(
          paymentLoading ? t('storefront:openingPayment') : t('storefront:continueToPayment'),
        )}
      </Button>
      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
        <Button
          className="min-h-11 px-3 text-sm underline underline-offset-4"
          variant="ghost"
          disabled={paymentLoading}
          onClick={onEditAddress}
        >
          {t('storefront:editAddress')}
        </Button>
        {paymentLoading ? (
          <Button className="min-h-11 px-3 text-sm" variant="ghost" disabled>
            {t('storefront:editBag')}
          </Button>
        ) : (
          <Button
            className="min-h-11 px-3 text-sm underline underline-offset-4"
            asChild
            variant="ghost"
          >
            <Link to="/cart">{t('storefront:editBag')}</Link>
          </Button>
        )}
      </div>
    </section>
  )
}
