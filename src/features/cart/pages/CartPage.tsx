import { localized, t, useI18n } from '../../../lib/i18n'
import { useCartCovers } from '../use-cart-covers'
import { ArrowRight, ShoppingBag } from 'lucide-react'
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
  EmptyMedia,
} from '../../../app/components/ui/empty'
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
  useI18n()

  const items = useCartStore((state) => state.items)
  const update = useCartStore((state) => state.update)
  const state = useCartStore()
  const covers = useCartCovers(items, state.owner)
  const blocked = cartBlocked(state)
  const count = cartCount(items)
  const total = cartTotal(items)
  const canCheckout = (!state.owner && !blocked) || checkoutCartReady(state)
  const checkoutAction = canCheckout ? (
    <Button asChild className="w-full">
      <Link to="/checkout">
        {t('storefront:continueToCheckout')} <ArrowRight size={17} />
      </Link>
    </Button>
  ) : (
    <Button disabled className="w-full">
      {t('storefront:continueToCheckout')}
    </Button>
  )
  return (
    <PageContainer className="bag-page py-12 sm:py-20">
      <BackLink to="/books">{t('storefront:continueBrowsing')}</BackLink>
      <div className="mt-7 flex items-end justify-between border-b border-border pb-7">
        <div>
          <p className="eyebrow mb-3">{t('storefront:yourSelection')}</p>
          <h1 className="font-serif text-5xl tracking-[-.05em]">{t('storefront:yourBag')}</h1>
        </div>
        <span className="text-sm text-muted-foreground">{t('common:bookCount', { count })}</span>
      </div>
      {items.length === 0 && ['loading', 'merging'].includes(state.status) ? null : items.length ===
        0 ? (
        <Empty className="py-28">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ShoppingBag aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle className="font-serif text-3xl">
              {t('storefront:nothingHereYet')}
            </EmptyTitle>
            <EmptyDescription>
              {t('storefront:thereAreGoodStoriesWaitingOnTheShelves')}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild>
              <Link to="/books">
                {t('storefront:browseBooks')} <ArrowRight size={17} />
              </Link>
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="grid gap-10 pt-9 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-16">
          <div className="divide-y divide-border">
            {items.map((item) => (
              <CartLine
                cover={covers.get(item.id)}
                key={item.id}
                item={item}
                update={update}
                disabled={blocked}
              />
            ))}
          </div>
          <SummaryPanel title={t('storefront:orderSummary')}>
            <div className="mt-7 flex justify-between text-base font-semibold">
              <span>{t('storefront:booksSubtotal')}</span>
              <span>{localized(money(total))}</span>
            </div>
            <div className="mt-4 flex flex-wrap justify-between gap-2 border-b border-border pb-5 text-sm text-muted-foreground">
              <span>{t('storefront:delivery')}</span>
              <span>{t('storefront:calculatedAtCheckout')}</span>
            </div>
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              {t('storefront:deliveryIsAddedAtCheckoutBookPricesAndAvailabilityAreConfirmed')}
            </p>
            <div className="mt-7 hidden lg:block">{localized(checkoutAction)}</div>
            {items.some((item) => item.available === false) && (
              <p role="alert" className="mt-3 text-sm">
                {t('storefront:removeOrDecreaseUnavailableSelectionsBeforeCheckout')}
              </p>
            )}
          </SummaryPanel>
        </div>
      )}
      {items.length > 0 && (
        <div className="sticky bottom-0 z-20 -mx-5 mt-8 border-t border-border bg-background px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:-mx-10 sm:px-10 lg:hidden">
          <div className="mb-3 flex items-baseline justify-between gap-4 text-sm">
            <span>{t('storefront:booksSubtotal')}</span>
            <strong className="text-lg">{localized(money(total))}</strong>
          </div>
          {localized(checkoutAction)}
        </div>
      )}
    </PageContainer>
  )
}
