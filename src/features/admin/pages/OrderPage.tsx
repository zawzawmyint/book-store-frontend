import { formatDateTime, money, serverDate } from '../../../lib/format'
import { localized, message as msg, t, useI18n } from '../../../lib/i18n'
import { DeliveryDetails } from '../../orders/DeliveryDetails'
import { RefundRetryDialog } from '../components/RefundRetryDialog'
import { PaymentStatus } from '../../orders/PaymentStatus'
import { useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { useApolloClient, useQuery } from '@apollo/client/react'
import { AdminOrderDocument } from '../../../generated/graphql'
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
import { dashboardReturnTo } from '../dashboard/dashboard-format'
import { adminListReturnTo } from '../activity-data'

export function OrderPage() {
  useI18n()

  const { id = '' } = useParams()
  return <OrderDetailPage key={id} id={id} />
}

function OrderDetailPage({ id }: { id: string }) {
  useI18n()

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
  const requestedReturn = (location.state as { returnTo?: unknown } | null)?.returnTo
  const dashboardReturn = dashboardReturnTo(requestedReturn)
  const returnTo = dashboardReturn ?? adminListReturnTo(requestedReturn, 'orders')
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
        ? msg('admin:orderCancelledRefundPending')
        : msg('admin:requestConfirmedAs', { value0: orderStatusLabels[updated.status] }),
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
        {localized(dashboardReturn ? t('admin:backToDashboard') : t('admin:backToOrderRequests'))}
      </Link>
      {notice && (
        <p role="status" className="mt-4">
          {localized(notice)}
        </p>
      )}
      <AdminFeedback loading={loading} error={localized(error)} retry={refreshOrder} />
      {!loading && !error && (!valid || !order) && (
        <h2 className="mt-6 font-serif text-3xl">{t('admin:orderRequestNotFound')}</h2>
      )}
      {!loading && !error && order && (
        <Card className="mt-6 max-w-3xl">
          <CardHeader>
            <CardTitle>{t('admin:orderRequestValue', { value0: order.id })}</CardTitle>
            <CardDescription>
              {localized(formatDateTime(serverDate(order.createdAt)))}
            </CardDescription>
            <p>
              <bdi dir="auto">{localized(order.customerName)}</bdi> ·{' '}
              <bdi dir="ltr">{localized(order.email)}</bdi>
            </p>
            <OrderStatusBadge status={order.status} paymentStatus={order.payment.status} />
            <PaymentStatus payment={order.payment} />
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              {order.items.map((line, index) => (
                <li key={index} className="flex flex-wrap justify-between gap-3 pb-3">
                  <span>
                    {localized(line.quantity)} × <bdi dir="auto">{localized(line.title)}</bdi>
                    <small className="block">
                      {t('admin:valueEach', { value0: money(line.unitPriceCents) })}
                    </small>
                  </span>
                  <strong>{localized(money(line.quantity * line.unitPriceCents))}</strong>
                  <Separator />
                </li>
              ))}
            </ul>

            <DeliveryDetails {...order} />
            <OrderTimeline history={order.history} attributed />
            {order.payment.status === 'REFUND_FAILED' &&
              hasCapability(access.role, 'PROCESS_ORDERS') &&
              !access.loading &&
              !access.expired && (
                <Button className="mt-4" onClick={() => setRefundOpen(true)}>
                  {t('admin:retryRefund')}
                </Button>
              )}
            {hasCapability(access.role, 'PROCESS_ORDERS') && !access.loading && !access.expired && (
              <div className="mt-6 flex flex-wrap gap-3">
                {order.status === 'SUBMITTED' &&
                  order.payment.status === 'PAID' &&
                  !order.payment.cancellationPending && (
                    <Button
                      disabled={!!target}
                      onClick={() => {
                        setNotice('')
                        setTarget('PREPARING')
                      }}
                    >
                      {t('admin:acceptAndPrepare')}
                    </Button>
                  )}
                {order.status === 'PREPARING' &&
                  order.payment.status === 'PAID' &&
                  !order.payment.cancellationPending && (
                    <Button
                      disabled={!!target}
                      onClick={() => {
                        setNotice('')
                        setTarget('SHIPPED')
                      }}
                    >
                      {t('admin:markShipped')}
                    </Button>
                  )}
                {order.status === 'SHIPPED' &&
                  order.payment.status === 'PAID' &&
                  !order.payment.cancellationPending && (
                    <Button
                      disabled={!!target}
                      onClick={() => {
                        setNotice('')
                        setTarget('DELIVERED')
                      }}
                    >
                      {t('admin:confirmDelivery')}
                    </Button>
                  )}
                {(order.status === 'SUBMITTED' || order.status === 'PREPARING') && (
                  <Button
                    disabled={!!target}
                    variant="destructive"
                    onClick={() => {
                      setNotice('')
                      setTarget('CANCELLED')
                    }}
                  >
                    {t('admin:cancelRequest')}
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
                setNotice(msg('admin:theRequestChangedReviewItsCurrentStatusAndConfirmAFresh'))
            }}
            refresh={refreshOrder}
          />
        )}
    </section>
  )
}
