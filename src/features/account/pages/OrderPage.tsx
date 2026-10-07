import { PaymentStatus } from '../../orders/PaymentStatus'
import { authClient } from '../../../lib/auth-client'
import { useEffect } from 'react'
import { useApolloClient, useQuery } from '@apollo/client/react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { MyOrderDocument } from '../../../generated/graphql'
import { PageContainer } from '../../../app/components/PageContainer'
import { Button } from '../../../app/components/ui/button'
import { Alert, AlertDescription } from '../../../app/components/ui/alert'
import { Card, CardContent, CardHeader } from '../../../app/components/ui/card'
import { money, serverDate } from '../../../lib/format'
import { signInPath } from '../../auth/return-to'
import { OrderStatusBadge } from '../../orders/OrderStatusBadge'
import { OrderTimeline } from '../../orders/OrderTimeline'
import { accessErrorCode } from '../../admin/admin-access'
export function OrderPage() {
  const { id = '' } = useParams()
  const valid = /^[1-9]\d*$/.test(id) && Number.isSafeInteger(Number(id))
  const client = useApolloClient()
  const navigate = useNavigate()
  const { refetch: refreshSession } = authClient.useSession()
  const { data, loading, error, refetch } = useQuery(MyOrderDocument, {
    variables: { id },
    skip: !valid,
    fetchPolicy: 'no-cache',
  })
  const expired = accessErrorCode(error) === 'UNAUTHENTICATED'
  useEffect(() => {
    if (expired)
      void client
        .clearStore()
        .then(() => refreshSession({ query: { disableCookieCache: true } }))
        .catch(() => {})
        .then(() => navigate(signInPath(`/account/orders/${id}`), { replace: true }))
  }, [expired, client, navigate, id, refreshSession])
  if (expired)
    return (
      <p role="status" className="py-24 text-center">
        Please sign in again…
      </p>
    )
  const order = data?.myOrder
  return (
    <PageContainer className="py-12 sm:py-20">
      <Link className="text-primary underline" to="/account/orders">
        Back to your orders
      </Link>
      {loading && (
        <p role="status" className="mt-8">
          Loading order request…
        </p>
      )}
      {error && (
        <Alert role="alert" variant="destructive" className="mt-8">
          <AlertDescription>
            {error.message}
            <Button variant="ghost" onClick={() => void refetch()}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}
      {!loading && !error && (!valid || !order) && (
        <h1 className="mt-8 font-serif text-3xl">Order request not found</h1>
      )}
      {!loading && !error && order && (
        <Card className="mt-8 max-w-3xl">
          <CardHeader>
            <h1 className="font-serif text-3xl">Order request #{order.id}</h1>
            <time
              className="block text-sm text-muted-foreground"
              dateTime={serverDate(order.createdAt).toISOString()}
            >
              {serverDate(order.createdAt).toLocaleString()}
            </time>
            <OrderStatusBadge status={order.status} />
            <PaymentStatus payment={order.payment} />
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              {order.items.map((line, index) => (
                <li
                  key={index}
                  className="flex flex-wrap justify-between gap-3 border-b border-border pb-3"
                >
                  <span>
                    {line.quantity} × {line.title}
                    <small className="block">{money(line.unitPriceCents)} each</small>
                  </span>
                  <strong>{money(line.quantity * line.unitPriceCents)}</strong>
                </li>
              ))}
            </ul>
            <p className="mt-6 flex justify-between font-semibold">
              <span>Total</span>
              <span>{money(order.totalCents)}</span>
            </p>
            <p className="mt-4 text-sm">
              Completed means handling finished. Delivery is not integrated.
            </p>
            {order.payment.required &&
              order.payment.status === 'PENDING' &&
              order.status === 'SUBMITTED' && (
                <div className="mt-4 flex flex-wrap gap-3">
                  <Button asChild>
                    <Link to={`/checkout/return/${order.id}`}>Resume payment</Link>
                  </Button>
                  <Button asChild variant="ghost">
                    <Link to={`/checkout/return/${order.id}`}>Check payment status</Link>
                  </Button>
                </div>
              )}
            <OrderTimeline history={order.history} />
          </CardContent>
        </Card>
      )}
    </PageContainer>
  )
}
