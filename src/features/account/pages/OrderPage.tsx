import { errorMessage } from '../../../lib/i18n/errors'
import { formatDateTime, money, serverDate } from '../../../lib/format'
import { localized, t, useI18n } from '../../../lib/i18n'
import { DeliveryDetails } from '../../orders/DeliveryDetails'
import { PaymentStatus } from '../../orders/PaymentStatus'
import { authClient } from '../../../lib/auth-client'
import { useEffect } from 'react'
import { useApolloClient, useQuery } from '@apollo/client/react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { MyOrderDocument } from '../../../generated/graphql'
import { PageContainer } from '../../../app/components/PageContainer'
import { BookLoader } from '../../../app/components/BookLoader'
import { Button } from '../../../app/components/ui/button'
import { Alert, AlertDescription } from '../../../app/components/ui/alert'
import { Card, CardContent, CardHeader } from '../../../app/components/ui/card'
import { signInPath } from '../../auth/return-to'
import { OrderStatusBadge } from '../../orders/OrderStatusBadge'
import { OrderTimeline } from '../../orders/OrderTimeline'
import { accessErrorCode } from '../../admin/admin-access'
export function OrderPage() {
  useI18n()

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
        {t('storefront:pleaseSignInAgain')}
      </p>
    )
  const order = data?.myOrder
  return (
    <PageContainer className="py-12 sm:py-20">
      <Link className="text-primary underline" to="/account/orders">
        {t('storefront:backToYourOrders')}
      </Link>
      {loading && <BookLoader label={t('storefront:loadingOrderRequest')} className="mt-8" />}
      {error && (
        <Alert role="alert" variant="destructive" className="mt-8">
          <AlertDescription>
            {localized(errorMessage(error, 'common:requestFailed'))}
            <Button variant="ghost" onClick={() => void refetch()}>
              {t('storefront:retry')}
            </Button>
          </AlertDescription>
        </Alert>
      )}
      {!loading && !error && (!valid || !order) && (
        <h1 className="mt-8 font-serif text-3xl">{t('storefront:orderRequestNotFound')}</h1>
      )}
      {!loading && !error && order && (
        <Card className="mt-8 max-w-3xl">
          <CardHeader>
            <h1 className="font-serif text-3xl">
              {t('storefront:orderRequestValue', { value0: order.id })}
            </h1>
            <time
              className="block text-sm text-muted-foreground"
              dateTime={serverDate(order.createdAt).toISOString()}
            >
              {localized(formatDateTime(serverDate(order.createdAt)))}
            </time>
            <OrderStatusBadge status={order.status} paymentStatus={order.payment.status} />
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
                    {localized(line.quantity)} × <bdi dir="auto">{localized(line.title)}</bdi>
                    <small className="block">
                      {t('storefront:valueEach', { value0: money(line.unitPriceCents) })}
                    </small>
                  </span>
                  <strong>{localized(money(line.quantity * line.unitPriceCents))}</strong>
                </li>
              ))}
            </ul>

            <DeliveryDetails {...order} />
            {order.payment.required &&
              order.payment.status === 'PENDING' &&
              order.status === 'SUBMITTED' && (
                <div className="mt-4 flex flex-wrap gap-3">
                  <Button asChild>
                    <Link to={`/checkout/return/${order.id}`}>{t('storefront:resumePayment')}</Link>
                  </Button>
                  <Button asChild variant="ghost">
                    <Link to={`/checkout/return/${order.id}`}>
                      {t('storefront:checkPaymentStatus')}
                    </Link>
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
