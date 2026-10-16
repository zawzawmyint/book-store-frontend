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
  return (
    <dl className="space-y-3 text-sm">
      <div className="flex justify-between gap-4">
        <dt>Books subtotal</dt>
        <dd>{money(amounts.subtotalCents)}</dd>
      </div>
      <div className="flex justify-between gap-4">
        <dt>Delivery</dt>
        <dd>
          {amounts.deliveryFeeCents === 0 ? 'Free delivery' : money(amounts.deliveryFeeCents)}
        </dd>
      </div>
      <div className="flex justify-between gap-4 border-t border-border pt-4 text-lg font-semibold">
        <dt>Total</dt>
        <dd>{money(amounts.totalCents)}</dd>
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
  const [expanded, setExpanded] = useState(false)
  const id = useId()
  const status = savedAttempt
    ? 'Saved payment attempt'
    : amounts
      ? 'Reviewed total'
      : 'Estimated books subtotal'
  return (
    <aside
      aria-label="Your order"
      className="h-fit min-w-0 bg-muted p-5 sm:p-7 lg:col-start-2 lg:row-start-1"
    >
      <h2 className="hidden font-serif text-2xl lg:block">Your order</h2>
      <button
        type="button"
        className="flex min-h-11 w-full items-center justify-between gap-4 text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring lg:hidden"
        aria-expanded={expanded}
        aria-controls={id}
        onClick={() => setExpanded(!expanded)}
      >
        <span className="font-serif text-xl">Your order</span>
        <ChevronDown aria-hidden="true" size={18} className={expanded ? 'rotate-180' : ''} />
      </button>
      <p className="mt-2 flex flex-wrap justify-between gap-2 text-sm text-muted-foreground">
        <span>{status}</span>
        <strong className="text-foreground lg:hidden">
          {money(amounts?.totalCents ?? cartTotal(items))}
        </strong>
      </p>
      <div id={id} className={expanded ? 'mt-6' : 'mt-6 hidden lg:block'}>
        {!savedAttempt && (
          <ul className="mb-6 space-y-4 border-b border-border pb-6">
            {items.map((item) => (
              <li key={item.id} className="flex justify-between gap-4 text-sm">
                <span className="min-w-0 break-words">
                  {item.quantity} × <span className="font-serif">{item.title}</span>
                </span>
                {!amounts && (
                  <span className="shrink-0">{money(item.priceCents * item.quantity)}</span>
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
              <dt>Books subtotal</dt>
              <dd>{money(cartTotal(items))}</dd>
            </div>
            <div className="flex flex-wrap justify-between gap-2 text-muted-foreground">
              <dt>Delivery</dt>
              <dd>Calculated at review</dd>
            </div>
          </dl>
        )}
        <p className="mt-5 text-xs leading-5 text-muted-foreground">
          {savedAttempt
            ? 'These amounts belong to your saved attempt. Check Orders before starting another.'
            : amounts
              ? 'Server-reviewed amounts. Stock is reserved only when payment setup succeeds.'
              : 'Book prices and availability are confirmed when you review your order.'}
        </p>
      </div>
    </aside>
  )
}
