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
import { PaymentStatus } from '../../orders/PaymentStatus'
import { money } from '../../../lib/format'

export function CheckoutReturnPage() {
  const { orderId = '' } = useParams()
  const { data: session } = authClient.useSession()
  return <PaymentReturn key={`${orderId}:${session?.user.id ?? ''}`} orderId={orderId} />
}
function PaymentReturn({ orderId }: { orderId: string }) {
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
      await client.clearStore()
      await refreshSession({ query: { disableCookieCache: true } })
      navigate(signInPath(`/checkout/return/${orderId}`), { replace: true })
    } else
      setError(
        failure instanceof Error
          ? failure.message
          : 'Payment confirmation is unavailable. Check again shortly.',
      )
  }
  async function check() {
    if (!valid || busy.current) return
    busy.current = true
    try {
      const result = await refresh({ variables: { orderId } })
      if (!alive.current) return
      const current = result.data?.refreshOrderPayment
      if (!current) throw new Error('Order unavailable or not found.')
      setOrder(current)
      if (session?.user.id) retireUnpaidAttempt(session.user.id, current)
      setError('')
      if (
        current.payment.status === 'PAID' &&
        session?.user.id &&
        confirmPaidAttempt(session.user.id, orderId, useCartStore.getState().items)
      )
        useCartStore.getState().clear()
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
      const result = await resume({ variables: { orderId } })
      const current = result.data?.resumeCheckout
      if (!current || !alive.current) return
      setOrder(current.order)
      if (session?.user.id) retireUnpaidAttempt(session.user.id, current.order)
      if (current.checkoutUrl) {
        if (!safeCheckoutUrl(current.checkoutUrl)) throw new Error('Payment link unavailable.')
        window.location.assign(current.checkoutUrl)
      } else if (
        current.order.payment.status === 'PAID' &&
        session?.user.id &&
        confirmPaidAttempt(session.user.id, orderId, useCartStore.getState().items)
      )
        useCartStore.getState().clear()
    } catch (failure) {
      await fail(failure)
    } finally {
      busy.current = false
    }
  }
  return (
    <PageContainer className="py-12 sm:py-20">
      <h1 className="font-serif text-4xl">
        {!valid
          ? 'Order unavailable or not found'
          : order?.payment.status === 'PAID'
            ? 'Payment confirmed'
            : 'Payment status'}
      </h1>
      {error && (
        <p role="alert" className="mt-4">
          {error}
        </p>
      )}
      {valid && !order && loading && <p role="status">Confirming payment…</p>}
      {order && (
        <div className="mt-6 max-w-xl space-y-5">
          <PaymentStatus payment={order.payment} />
          {order.payment.status === 'PENDING' && (
            <p role="status">
              {stopped
                ? 'Payment has not been confirmed. Check payment status when you are ready.'
                : 'Payment has not been confirmed. Confirming payment. Returning from Stripe does not cancel your order.'}
            </p>
          )}
          {order.payment.status === 'EXPIRED' && (
            <p>
              Your payment window expired and the reservation was released. Return to your bag for a
              new stock check.
            </p>
          )}
          <ul>
            {order.items.map((line, index) => (
              <li key={index}>
                {line.quantity} × <span className="font-serif">{line.title}</span> ·{' '}
                {money(line.quantity * line.unitPriceCents)}
              </li>
            ))}
          </ul>
          <p className="font-semibold">Total {money(order.totalCents)}</p>
          {order.status === 'SUBMITTED' && order.payment.status === 'PENDING' && (
            <Button disabled={loading || resuming} onClick={() => void openPayment()}>
              Resume payment
            </Button>
          )}
          <Button asChild variant="ghost">
            <Link to={`/account/orders/${order.id}`}>View order details</Link>
          </Button>
        </div>
      )}
      {valid && (!order || order.payment.status === 'PENDING') && (
        <Button className="mt-5" disabled={loading || resuming} onClick={() => void check()}>
          Check payment status
        </Button>
      )}
      <Link className="mt-6 block text-primary underline" to="/cart">
        Back to bag
      </Link>
    </PageContainer>
  )
}
