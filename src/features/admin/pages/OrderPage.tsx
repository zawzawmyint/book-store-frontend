import { RefundRetryDialog } from '../components/RefundRetryDialog'
import { PaymentStatus } from '../../orders/PaymentStatus'
import { useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { useApolloClient, useQuery } from '@apollo/client/react'
import { AdminOrderDocument } from '../../../generated/graphql'
import { money, serverDate } from '../../../lib/format'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../app/components/ui/card'
import { Button } from '../../../app/components/ui/button'
import { OrderStatusBadge } from '../../orders/OrderStatusBadge'
import { OrderTimeline } from '../../orders/OrderTimeline'
import { OrderStatusDialog } from '../components/OrderStatusDialog'
import type { AdminOrderDetailFragment, OrderStatus } from '../../../generated/graphql'
import { orderStatusLabels } from '../../orders/order-status'
import { hasCapability, useAdminAccess } from '../admin-access'
import { Separator } from '../../../app/components/ui/separator'
import { useAdminQueryError } from '../admin-access'
import { AdminFeedback } from '../components/AdminFeedback'

export function OrderPage() {
  const { id = '' } = useParams()
  return <OrderDetailPage key={id} id={id} />
}

function OrderDetailPage({ id }: { id: string }) {
  const client = useApolloClient()
  const access = useAdminAccess()
  const [current, setCurrent] = useState<AdminOrderDetailFragment>()
  const [target, setTarget] = useState<OrderStatus>()
  const [draft, setDraft] = useState('')
  const [notice, setNotice] = useState('')
  const [refundOpen, setRefundOpen] = useState(false)
  const valid = /^[1-9]\d*$/.test(id) && Number.isSafeInteger(Number(id))
  const { data, loading, error, refetch } = useQuery(AdminOrderDocument, {
    variables: { id },
    skip: !valid,
    fetchPolicy: 'no-cache',
  })
  useAdminQueryError(error)
  const location = useLocation()
  const requestedReturn = (location.state as { returnTo?: string } | null)?.returnTo
  const returnTo = requestedReturn?.startsWith('/admin/orders?') ? requestedReturn : '/admin/orders'
  const order = current?.id === id ? current : data?.adminOrder
  async function refreshOrder() {
    const result = await refetch()
    setCurrent(result.data?.adminOrder ?? undefined)
    return result.data?.adminOrder
  }
  function saved(updated: AdminOrderDetailFragment) {
    setCurrent(updated)
    setTarget(undefined)
    setDraft('')
    setNotice(
      updated.status === 'CANCELLED' && updated.payment.status === 'REFUND_PENDING'
        ? 'Order cancelled; refund pending'
        : 'Request confirmed as ' + orderStatusLabels[updated.status] + '.',
    )
    for (const fieldName of [
      'adminOrders',
      'myOrders',
      'myOrder',
      'adminBooks',
      'adminBook',
      'books',
      'book',
      'adminActivity',
    ])
      client.cache.evict({ fieldName })
    client.cache.gc()
  }
  return (
    <section>
      <Link className="admin-back-link" to={returnTo}>
        Back to order requests
      </Link>
      {notice && (
        <p role="status" className="mt-4">
          {notice}
        </p>
      )}
      <AdminFeedback loading={loading} error={error} retry={refreshOrder} />
      {!loading && !error && (!valid || !order) && (
        <h2 className="mt-6 font-serif text-3xl">Order request not found</h2>
      )}
      {!loading && !error && order && (
        <Card className="mt-6 max-w-3xl">
          <CardHeader>
            <CardTitle>Order request #{order.id}</CardTitle>
            <CardDescription>{serverDate(order.createdAt).toLocaleString()}</CardDescription>
            <p>
              {order.customerName} · {order.email}
            </p>
            <OrderStatusBadge status={order.status} />
            <PaymentStatus payment={order.payment} />
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              {order.items.map((line, index) => (
                <li key={index} className="flex flex-wrap justify-between gap-3 pb-3">
                  <span>
                    {line.quantity} × {line.title}
                    <small className="block">{money(line.unitPriceCents)} each</small>
                  </span>
                  <strong>{money(line.quantity * line.unitPriceCents)}</strong>
                  <Separator />
                </li>
              ))}
            </ul>
            <p className="mt-6 flex justify-between text-lg font-semibold">
              <span>Total</span>
              <span>{money(order.totalCents)}</span>
            </p>
            <p className="mt-4 text-sm">
              Completed means handling finished. Delivery is not integrated.
            </p>
            <OrderTimeline history={order.history} attributed />
            {order.payment.status === 'REFUND_FAILED' &&
              hasCapability(access.role, 'PROCESS_ORDERS') &&
              !access.loading &&
              !access.expired && (
                <Button className="mt-4" onClick={() => setRefundOpen(true)}>
                  Retry refund
                </Button>
              )}
            {hasCapability(access.role, 'PROCESS_ORDERS') && !access.loading && !access.expired && (
              <div className="mt-6 flex flex-wrap gap-3">
                {order.status === 'SUBMITTED' &&
                  (!order.payment.required || order.payment.status === 'PAID') && (
                    <Button
                      disabled={!!target}
                      onClick={() => {
                        setNotice('')
                        setTarget('ACCEPTED')
                      }}
                    >
                      Accept request
                    </Button>
                  )}
                {order.status === 'ACCEPTED' &&
                  (!order.payment.required || order.payment.status === 'PAID') && (
                    <Button
                      disabled={!!target}
                      onClick={() => {
                        setNotice('')
                        setTarget('COMPLETED')
                      }}
                    >
                      Complete request
                    </Button>
                  )}
                {(order.status === 'SUBMITTED' || order.status === 'ACCEPTED') && (
                  <Button
                    disabled={!!target}
                    variant="destructive"
                    onClick={() => {
                      setNotice('')
                      setTarget('CANCELLED')
                    }}
                  >
                    Cancel request
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
      {order &&
        refundOpen &&
        hasCapability(access.role, 'PROCESS_ORDERS') &&
        !access.expired &&
        !access.loading && (
          <RefundRetryDialog
            order={order}
            close={() => setRefundOpen(false)}
            saved={saved}
            refresh={refreshOrder}
          />
        )}
      {order &&
        target &&
        hasCapability(access.role, 'PROCESS_ORDERS') &&
        !access.loading &&
        !access.expired && (
          <OrderStatusDialog
            order={order}
            target={target}
            close={() => setTarget(undefined)}
            draft={draft}
            setDraft={setDraft}
            saved={saved}
            refreshed={(updated) => {
              setCurrent(updated)
              if (updated.status !== order.status)
                setNotice(
                  'The request changed. Review its current status and confirm a fresh action.',
                )
            }}
            refresh={refreshOrder}
          />
        )}
    </section>
  )
}
