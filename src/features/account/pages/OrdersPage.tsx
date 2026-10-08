import { PaymentStatus } from '../../orders/PaymentStatus'
import { OrderStatusBadge } from '../../orders/OrderStatusBadge'
import { useEffect, useState } from 'react'
import { useApolloClient, useQuery } from '@apollo/client/react'
import { Link, useNavigate } from 'react-router-dom'
import { MyOrdersDocument } from '../../../generated/graphql'
import { money, serverDate } from '../../../lib/format'
import { PageContainer } from '../../../app/components/PageContainer'
import { Alert, AlertDescription } from '../../../app/components/ui/alert'
import { Button } from '../../../app/components/ui/button'
import { Card, CardContent, CardHeader } from '../../../app/components/ui/card'
import { Separator } from '../../../app/components/ui/separator'
import { Skeleton } from '../../../app/components/ui/skeleton'
import { signInPath } from '../../auth/return-to'

const pageSize = 20

export function OrdersPage() {
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
        Please sign in again…
      </div>
    )

  const orders = data?.myOrders
  return (
    <PageContainer className="py-12 sm:py-20">
      <p className="eyebrow mb-3">Your account</p>
      <h1 className="font-serif text-5xl">Your orders</h1>
      <p className="mt-4 text-sm text-muted-foreground">
        Your saved orders, payment state, and request progress.
      </p>
      {loading && (
        <div role="status" aria-label="Loading your orders" className="mt-10 space-y-6">
          <span className="sr-only">Loading your orders…</span>
          <Skeleton className="h-32 w-full bg-muted" />
          <Skeleton className="h-32 w-full bg-muted" />
        </div>
      )}
      {error && !unauthenticated && (
        <Alert
          variant="destructive"
          className="mt-10 border-destructive bg-destructive-muted text-destructive"
        >
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}
      {!loading && !error && orders?.items.length === 0 && (
        <div className="mt-12">
          <p>No order requests yet.</p>
          <Button asChild variant="ghost" className="mt-3 text-primary underline">
            <Link to="/">Browse books</Link>
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
                    <h2 className="font-serif text-2xl">Order #{order.id}</h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {serverDate(order.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <OrderStatusBadge status={order.status} paymentStatus={order.payment.status} />
                  <PaymentStatus payment={order.payment} />
                  <strong>{money(order.totalCents)}</strong>
                </CardHeader>
                <CardContent>
                  <Separator className="mb-4 bg-border" />
                  <ul className="space-y-2 text-sm">
                    {order.items.map((item, index) => (
                      <li key={`${order.id}-${index}`} className="flex justify-between gap-4">
                        <span>
                          {item.quantity} × <span className="font-serif">{item.title}</span>
                        </span>
                        <span>{money(item.quantity * item.unitPriceCents)}</span>
                      </li>
                    ))}
                  </ul>
                  <Button asChild variant="ghost" className="mt-4">
                    <Link to={`/account/orders/${order.id}`}>View details</Link>
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
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page + 1} of {Math.ceil(orders.total / pageSize)}
            </span>
            <Button
              type="button"
              variant="ghost"
              disabled={(page + 1) * pageSize >= orders.total}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
            </Button>
          </div>
        </>
      )}
    </PageContainer>
  )
}
