import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cartBlocked, checkoutCartReady, useCartStore } from '../cart-store'
import { cartCount, cartTotal } from '../cart'
import { money } from '../../../lib/format'
import { BackLink } from '../../../app/components/BackLink'
import { PageContainer } from '../../../app/components/PageContainer'
import { SummaryPanel } from '../../../app/components/SummaryPanel'
import { CartLine } from '../components/CartLine'
import { Button } from '../../../app/components/ui/button'

export function CartPage() {
  const items = useCartStore((state) => state.items)
  const update = useCartStore((state) => state.update)
  const state = useCartStore()
  const blocked = cartBlocked(state)
  const count = cartCount(items)
  const total = cartTotal(items)
  const canCheckout = (!state.owner && !blocked) || checkoutCartReady(state)
  const checkoutAction = canCheckout ? (
    <Button asChild className="w-full">
      <Link to="/checkout">
        Continue to checkout <ArrowRight size={17} />
      </Link>
    </Button>
  ) : (
    <Button disabled className="w-full">
      Continue to checkout
    </Button>
  )
  return (
    <PageContainer className="bag-page py-12 sm:py-20">
      <BackLink to="/books">Continue browsing</BackLink>
      <div className="mt-7 flex items-end justify-between border-b border-border pb-7">
        <div>
          <p className="eyebrow mb-3">Your selection</p>
          <h1 className="font-serif text-5xl tracking-[-.05em]">Your bag</h1>
        </div>
        <span className="text-sm text-muted-foreground">
          {count} {count === 1 ? 'book' : 'books'}
        </span>
      </div>
      {items.length === 0 && ['loading', 'merging'].includes(state.status) ? null : items.length ===
        0 ? (
        <div className="py-28 text-center">
          <p className="font-serif text-3xl">Nothing here yet.</p>
          <p className="mt-3 text-sm text-muted-foreground">
            There are good stories waiting on the shelves.
          </p>
          <Button asChild className="mt-8">
            <Link to="/books">
              Browse books <ArrowRight size={17} />
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-10 pt-9 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-16">
          <div className="divide-y divide-border">
            {items.map((item) => (
              <CartLine key={item.id} item={item} update={update} disabled={blocked} />
            ))}
          </div>
          <SummaryPanel title="Order summary">
            <div className="mt-7 flex justify-between text-base font-semibold">
              <span>Books subtotal</span>
              <span>{money(total)}</span>
            </div>
            <div className="mt-4 flex flex-wrap justify-between gap-2 border-b border-border pb-5 text-sm text-muted-foreground">
              <span>Delivery</span>
              <span>Calculated at checkout</span>
            </div>
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              Delivery is added at checkout. Book prices and availability are confirmed by the
              server.
            </p>
            <div className="mt-7 hidden lg:block">{checkoutAction}</div>
            {items.some((item) => item.available === false) && (
              <p role="alert" className="mt-3 text-sm">
                Remove or decrease unavailable selections before checkout.
              </p>
            )}
          </SummaryPanel>
        </div>
      )}
      {items.length > 0 && (
        <div className="sticky bottom-0 z-20 -mx-5 mt-8 border-t border-border bg-background px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:-mx-10 sm:px-10 lg:hidden">
          <div className="mb-3 flex items-baseline justify-between gap-4 text-sm">
            <span>Books subtotal</span>
            <strong className="text-lg">{money(total)}</strong>
          </div>
          {checkoutAction}
        </div>
      )}
    </PageContainer>
  )
}
