import { errorMessage } from '../../../lib/i18n/errors'
import { formatDate, money, serverDate } from '../../../lib/format'
import { localized, t, useI18n } from '../../../lib/i18n'
import { PaymentStatus } from '../../orders/PaymentStatus'
import { OrderStatusBadge } from '../../orders/OrderStatusBadge'
import { useEffect, useState } from 'react'
import { useApolloClient, useQuery } from '@apollo/client/react'
import { Link, useNavigate } from 'react-router-dom'
import { MyOrdersDocument } from '../../../generated/graphql'
import { PageContainer } from '../../../app/components/PageContainer'
import { Alert, AlertDescription } from '../../../app/components/ui/alert'
import { Button } from '../../../app/components/ui/button'
import { Card, CardContent, CardHeader } from '../../../app/components/ui/card'
import { Separator } from '../../../app/components/ui/separator'
import { Item, ItemContent, ItemActions } from '../../../app/components/ui/item'
import { Skeleton } from '../../../app/components/ui/skeleton'
import { BookLoader } from '../../../app/components/BookLoader'
import { signInPath } from '../../auth/return-to'

const pageSize = 20

export function OrdersPage() {
  useI18n()

  const [page, setPage] = useState(0)
  const navigate = useNavigate()
  const client = useApolloClient()
  const { data, loading, error } = useQuery(MyOrdersDocument, {
    variables: { limit: pageSize, offset: page * pageSize },
    fetchPolicy: 'no-cache',
  })
  const unauthenticated =
    error &&
    'errors' in error &&
    (error as { errors?: Array<{ extensions?: { code?: string } }> }).errors?.some(
      (entry) => entry.extensions?.code === 'UNAUTHENTICATED',
    )

  useEffect(() => {
    if (unauthenticated)
      void client
        .clearStore()
        .then(() => navigate(signInPath('/account/orders'), { replace: true }))
  }, [unauthenticated, client, navigate])

  if (unauthenticated)
    return (
      <div role="status" className="py-24 text-center">
        {t('storefront:pleaseSignInAgain')}
      </div>
    )

  const orders = data?.myOrders
  return (
    <PageContainer className="py-12 sm:py-20">
      <p className="eyebrow mb-3">{t('storefront:yourAccount')}</p>
      <h1 className="font-serif text-5xl">{t('storefront:yourOrders')}</h1>
      <p className="mt-4 text-sm text-muted-foreground">
        {t('storefront:yourSavedOrdersPaymentStateAndRequestProgress')}
      </p>
      {loading && (
        <div className="mt-10 space-y-6">
          <BookLoader label={t('storefront:loadingYourOrders')} />
          <Skeleton className="h-32 w-full bg-muted" />
          <Skeleton className="h-32 w-full bg-muted" />
        </div>
      )}
      {error && !unauthenticated && (
        <Alert
          variant="destructive"
          className="mt-10 border-destructive bg-destructive-muted text-destructive"
        >
          <AlertDescription>
            {localized(errorMessage(error, 'common:requestFailed'))}
          </AlertDescription>
        </Alert>
      )}
      {!loading && !error && orders?.items.length === 0 && (
        <div className="mt-12">
          <p>{t('storefront:noOrderRequestsYet')}</p>
          <Button asChild variant="ghost" className="mt-3 text-primary underline">
            <Link to="/books">{t('storefront:browseBooks')}</Link>
          </Button>
        </div>
      )}
      {!loading && !error && orders && orders.items.length > 0 && (
        <>
          <div className="mt-10 space-y-6">
            {orders.items.map((order) => (
              <Card key={order.id} className="border-border bg-surface shadow-none">
                <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-4">
                  <div>
                    <h2 className="font-serif text-2xl">
                      {t('storefront:orderValue', { value0: order.id })}
                    </h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {localized(formatDate(serverDate(order.createdAt)))}
                    </p>
                  </div>
                  <OrderStatusBadge status={order.status} paymentStatus={order.payment.status} />
                  <PaymentStatus payment={order.payment} />
                  <strong>{localized(money(order.totalCents))}</strong>
                </CardHeader>
                <CardContent>
                  <Separator className="mb-4 bg-border" />
                  <ul className="space-y-2 text-sm">
                    {order.items.map((item, index) => (
                      <Item
                        asChild
                        key={`${order.id}-${index}`}
                        className="items-start gap-4 rounded-none p-0"
                      >
                        <li>
                          <ItemContent className="block">
                            {localized(item.quantity)} ×{' '}
                            <span className="font-serif">
                              <bdi dir="auto">{localized(item.title)}</bdi>
                            </span>
                          </ItemContent>
                          <ItemActions>
                            {localized(money(item.quantity * item.unitPriceCents))}
                          </ItemActions>
                        </li>
                      </Item>
                    ))}
                  </ul>
                  <Button asChild variant="ghost" className="mt-4">
                    <Link to={`/account/orders/${order.id}`}>{t('storefront:viewDetails')}</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="mt-8 flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="ghost"
              disabled={page === 0}
              onClick={() => setPage((current) => current - 1)}
            >
              {t('storefront:previous')}
            </Button>
            <span className="text-sm text-muted-foreground">
              {t('storefront:pageValueOfValue', {
                value0: page + 1,
                value1: Math.ceil(orders.total / pageSize),
              })}
            </span>
            <Button
              type="button"
              variant="ghost"
              disabled={(page + 1) * pageSize >= orders.total}
              onClick={() => setPage((current) => current + 1)}
            >
              {t('storefront:next')}
            </Button>
          </div>
        </>
      )}
    </PageContainer>
  )
}
