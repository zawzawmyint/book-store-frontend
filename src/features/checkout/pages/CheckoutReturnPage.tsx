import { errorMessage } from '../../../lib/i18n/errors'
import { localized, message as msg, t, useI18n } from '../../../lib/i18n'
import { DeliveryDetails } from '../../orders/DeliveryDetails'
import { useEffect, useRef, useState } from 'react'
import { useApolloClient, useMutation } from '@apollo/client/react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  RefreshOrderPaymentDocument,
  ResumeCheckoutDocument,
  type CustomerOrderFieldsFragment,
} from '../../../generated/graphql'
import { authClient } from '../../../lib/auth-client'
import { useCartStore } from '../../cart/cart-store'
import { confirmPaidAttempt, retireUnpaidAttempt, safeCheckoutUrl } from '../checkout-attempt'
import { accessErrorCode } from '../../admin/admin-access'
import { signInPath } from '../../auth/return-to'
import { PageContainer } from '../../../app/components/PageContainer'
import { Button } from '../../../app/components/ui/button'
import { BookLoader } from '../../../app/components/BookLoader'
import { PaymentStatus } from '../../orders/PaymentStatus'
import { money } from '../../../lib/format'

export function CheckoutReturnPage() {
  useI18n()

  const { orderId = '' } = useParams()
  const { data: session } = authClient.useSession()
  return <PaymentReturn key={`${orderId}:${session?.user.id ?? ''}`} orderId={orderId} />
}
function PaymentReturn({ orderId }: { orderId: string }) {
  useI18n()

  const valid = /^[1-9]\d*$/.test(orderId) && Number.isSafeInteger(Number(orderId))
  const [order, setOrder] = useState<CustomerOrderFieldsFragment>()
  const [error, setError] = useState('')
  const [stopped, setStopped] = useState(false)
  const [refresh, { loading }] = useMutation(RefreshOrderPaymentDocument)
  const [resume, { loading: resuming }] = useMutation(ResumeCheckoutDocument)
  const { data: session, refetch: refreshSession } = authClient.useSession()
  const client = useApolloClient()
  const navigate = useNavigate()
  const alive = useRef(true)
  const busy = useRef(false)
  async function fail(failure: unknown) {
    if (!alive.current) return
    if (accessErrorCode(failure) === 'UNAUTHENTICATED') {
      void useCartStore.getState().identify(undefined)
      await client.clearStore()
      await refreshSession({ query: { disableCookieCache: true } })
      navigate(signInPath(`/checkout/return/${orderId}`), { replace: true })
    } else
      setError(
        errorMessage(failure, 'storefront:paymentConfirmationIsUnavailableCheckAgainShortly'),
      )
  }
  async function check() {
    if (!valid || busy.current) return
    busy.current = true
    try {
      const result = await refresh({
        variables: { orderId },
        context: { headers: { 'X-Cart-Account': session?.user.id ?? '' } },
      })
      if (!alive.current) return
      const current = result.data?.refreshOrderPayment
      if (!current) throw new Error(msg('storefront:orderUnavailableOrNotFound'))
      setOrder(current)
      if (session?.user.id) retireUnpaidAttempt(session.user.id, current)
      setError('')
      if (current.payment.status === 'PAID' && session?.user.id) {
        confirmPaidAttempt(session.user.id, orderId, useCartStore.getState().items)
        await useCartStore.getState().refresh()
      }
      return current
    } catch (failure) {
      await fail(failure)
    } finally {
      busy.current = false
    }
  }
  useEffect(() => {
    alive.current = true
    let timer: ReturnType<typeof setTimeout>
    const deadline = Date.now() + 30_000
    async function poll() {
      if (!alive.current) return
      if (Date.now() >= deadline) {
        setStopped(true)
        return
      }
      if (document.visibilityState === 'hidden') {
        timer = setTimeout(poll, 3000)
        return
      }
      const current = await check()
      if (!alive.current || (current && current.payment.status !== 'PENDING')) return
      timer = setTimeout(poll, 3000)
    }
    void poll()
    return () => {
      alive.current = false
      clearTimeout(timer)
    }
    // Entry reconciliation has a fixed window; rerenders must not restart it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, session?.user.id])
  async function openPayment() {
    if (busy.current || resuming) return
    busy.current = true
    try {
      const result = await resume({
        variables: { orderId },
        context: { headers: { 'X-Cart-Account': session?.user.id ?? '' } },
      })
      const current = result.data?.resumeCheckout
      if (!current || !alive.current) return
      setOrder(current.order)
      if (session?.user.id) retireUnpaidAttempt(session.user.id, current.order)
      if (current.checkoutUrl) {
        if (!safeCheckoutUrl(current.checkoutUrl))
          throw new Error(msg('storefront:paymentLinkUnavailable'))
        window.location.assign(current.checkoutUrl)
      } else if (current.order.payment.status === 'PAID' && session?.user.id) {
        confirmPaidAttempt(session.user.id, orderId, useCartStore.getState().items)
        await useCartStore.getState().refresh()
      }
    } catch (failure) {
      await fail(failure)
    } finally {
      busy.current = false
    }
  }
  return (
    <PageContainer className="py-12 sm:py-20">
      <h1 className="font-serif text-4xl">
        {localized(
          !valid
            ? t('storefront:orderUnavailableOrNotFound2')
            : order?.payment.status === 'PAID'
              ? t('storefront:paymentConfirmed')
              : t('storefront:paymentStatus'),
        )}
      </h1>
      {error && (
        <p role="alert" className="mt-4">
          {localized(error)}
        </p>
      )}
      {valid && !order && loading && (
        <BookLoader compact label={t('storefront:confirmingPayment')} />
      )}
      {order && (
        <div className="mt-6 max-w-xl space-y-5">
          <PaymentStatus payment={order.payment} />
          {order.payment.status === 'PENDING' && (
            <p role="status">
              {localized(
                stopped
                  ? t('storefront:paymentHasNotBeenConfirmedCheckPaymentStatusWhenYouAre')
                  : t(
                      'storefront:paymentHasNotBeenConfirmedConfirmingPaymentReturningFromStripeDoes',
                    ),
              )}
            </p>
          )}
          {order.payment.status === 'EXPIRED' && (
            <p>{t('storefront:yourPaymentWindowExpiredAndTheReservationWasReleasedReturnTo')}</p>
          )}
          <ul>
            {order.items.map((line, index) => (
              <li key={index}>
                {localized(line.quantity)} ×{' '}
                <span className="font-serif">
                  <bdi dir="auto">{localized(line.title)}</bdi>
                </span>{' '}
                · {localized(money(line.quantity * line.unitPriceCents))}
              </li>
            ))}
          </ul>
          <DeliveryDetails {...order} />
          {order.status === 'SUBMITTED' && order.payment.status === 'PENDING' && (
            <Button disabled={loading || resuming} onClick={() => void openPayment()}>
              {t('storefront:resumePayment')}
            </Button>
          )}
          <Button asChild variant="ghost">
            <Link to={`/account/orders/${order.id}`}>{t('storefront:viewOrderDetails')}</Link>
          </Button>
        </div>
      )}
      {valid && (!order || order.payment.status === 'PENDING') && (
        <Button className="mt-5" disabled={loading || resuming} onClick={() => void check()}>
          {t('storefront:checkPaymentStatus')}
        </Button>
      )}
      <Link className="mt-6 block text-primary underline" to="/cart">
        {t('storefront:backToBag')}
      </Link>
    </PageContainer>
  )
}
