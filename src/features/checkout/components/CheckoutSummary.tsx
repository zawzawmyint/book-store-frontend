import { localized, message as msg, t, useI18n } from '../../../lib/i18n'
import { useId, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { CartItem } from '../../cart/cart'
import { cartTotal } from '../../cart/cart'
import { money } from '../../../lib/format'

export type CheckoutAmounts = {
  subtotalCents: number
  deliveryFeeCents: number
  totalCents: number
}

export function CheckoutTotals({ amounts }: { amounts: CheckoutAmounts }) {
  useI18n()

  return (
    <dl className="space-y-3 text-sm">
      <div className="flex justify-between gap-4">
        <dt>{t('storefront:booksSubtotal')}</dt>
        <dd>{localized(money(amounts.subtotalCents))}</dd>
      </div>
      <div className="flex justify-between gap-4">
        <dt>{t('storefront:delivery')}</dt>
        <dd>
          {localized(
            amounts.deliveryFeeCents === 0
              ? t('storefront:freeDelivery')
              : money(amounts.deliveryFeeCents),
          )}
        </dd>
      </div>
      <div className="flex justify-between gap-4 border-t border-border pt-4 text-lg font-semibold">
        <dt>{t('storefront:total')}</dt>
        <dd>{localized(money(amounts.totalCents))}</dd>
      </div>
    </dl>
  )
}

export function CheckoutSummary({
  items,
  amounts,
  savedAttempt = false,
}: {
  items: CartItem[]
  amounts?: CheckoutAmounts
  savedAttempt?: boolean
}) {
  useI18n()

  const [expanded, setExpanded] = useState(false)
  const id = useId()
  const status = savedAttempt
    ? msg('storefront:savedPaymentAttempt')
    : amounts
      ? msg('storefront:reviewedTotal')
      : msg('storefront:estimatedBooksSubtotal')
  return (
    <aside
      aria-label={t('storefront:yourOrder')}
      className="h-fit min-w-0 bg-muted p-5 sm:p-7 lg:col-start-2 lg:row-start-1"
    >
      <h2 className="hidden font-serif text-2xl lg:block">{t('storefront:yourOrder')}</h2>
      <button
        type="button"
        className="flex min-h-11 w-full items-center justify-between gap-4 text-start focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring lg:hidden"
        aria-expanded={expanded}
        aria-controls={id}
        onClick={() => setExpanded(!expanded)}
      >
        <span className="font-serif text-xl">{t('storefront:yourOrder')}</span>
        <ChevronDown aria-hidden="true" size={18} className={expanded ? 'rotate-180' : ''} />
      </button>
      <p className="mt-2 flex flex-wrap justify-between gap-2 text-sm text-muted-foreground">
        <span>{localized(status)}</span>
        <strong className="text-foreground lg:hidden">
          {localized(money(amounts?.totalCents ?? cartTotal(items)))}
        </strong>
      </p>
      <div id={id} className={expanded ? 'mt-6' : 'mt-6 hidden lg:block'}>
        {!savedAttempt && (
          <ul className="mb-6 space-y-4 border-b border-border pb-6">
            {items.map((item) => (
              <li key={item.id} className="flex justify-between gap-4 text-sm">
                <span className="min-w-0 break-words">
                  {localized(item.quantity)} ×{' '}
                  <span className="font-serif">
                    <bdi dir="auto">{localized(item.title)}</bdi>
                  </span>
                </span>
                {!amounts && (
                  <span className="shrink-0">
                    {localized(money(item.priceCents * item.quantity))}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
        {amounts ? (
          <CheckoutTotals amounts={amounts} />
        ) : (
          <dl className="space-y-4 text-sm">
            <div className="flex justify-between gap-4 font-semibold">
              <dt>{t('storefront:booksSubtotal')}</dt>
              <dd>{localized(money(cartTotal(items)))}</dd>
            </div>
            <div className="flex flex-wrap justify-between gap-2 text-muted-foreground">
              <dt>{t('storefront:delivery')}</dt>
              <dd>{t('storefront:calculatedAtReview')}</dd>
            </div>
          </dl>
        )}
        <p className="mt-5 text-xs leading-5 text-muted-foreground">
          {localized(
            savedAttempt
              ? t('storefront:theseAmountsBelongToYourSavedAttemptCheckOrdersBeforeStarting')
              : amounts
                ? t('storefront:serverReviewedAmountsStockIsReservedOnlyWhenPaymentSetupSucceeds')
                : t('storefront:bookPricesAndAvailabilityAreConfirmedWhenYouReviewYourOrder'),
          )}
        </p>
      </div>
    </aside>
  )
}
