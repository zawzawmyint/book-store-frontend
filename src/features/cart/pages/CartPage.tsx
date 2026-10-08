import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useCartStore } from '../cart-store'
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
  const count = cartCount(items)
  const total = cartTotal(items)
  return (
    <PageContainer className="py-12 sm:py-20">
      <BackLink to="/">Continue browsing</BackLink>
      <div className="mt-7 flex items-end justify-between border-b border-border pb-7">
        <div>
          <p className="eyebrow mb-3">Your selection</p>
          <h1 className="font-serif text-5xl tracking-[-.05em]">Your bag</h1>
        </div>
        <span className="text-sm text-muted-foreground">
          {count} {count === 1 ? 'book' : 'books'}
        </span>
      </div>
      {items.length === 0 ? (
        <div className="py-28 text-center">
          <p className="font-serif text-3xl">Nothing here yet.</p>
          <p className="mt-3 text-sm text-muted-foreground">
            There are good stories waiting on the shelves.
          </p>
          <Button asChild className="mt-8">
            <Link to="/">
              Browse books <ArrowRight size={17} />
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-12 pt-9 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-16">
          <div className="divide-y divide-border">
            {items.map((item) => (
              <CartLine key={item.id} item={item} update={update} />
            ))}
          </div>
          <SummaryPanel title="Order summary">
            <div className="mt-7 flex justify-between border-b border-border pb-5 text-sm">
              <span className="text-muted-foreground">
                Books subtotal · {count} {count === 1 ? 'book' : 'books'}
              </span>
              <strong>{money(total)}</strong>
            </div>
            <div className="mt-5 flex justify-between text-base font-semibold">
              <span>Books subtotal</span>
              <span>{money(total)}</span>
            </div>
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              Delivery is added at checkout. Book prices and availability are confirmed by the
              server.
            </p>
            <Button asChild className="mt-7 flex w-full">
              <Link to="/checkout">
                Continue to checkout <ArrowRight size={17} />
              </Link>
            </Button>
          </SummaryPanel>
        </div>
      )}
    </PageContainer>
  )
}
