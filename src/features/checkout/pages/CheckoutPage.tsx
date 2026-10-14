import { useEffect, useRef, useState } from 'react'
import { CombinedGraphQLErrors } from '@apollo/client'
import { useApolloClient, useMutation, useQuery } from '@apollo/client/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from 'react-router-dom'
import { authClient } from '../../../lib/auth-client'
import { signInPath } from '../../auth/return-to'
import { checkoutCartReady, useCartStore } from '../../cart/cart-store'
import { cartTotal } from '../../cart/cart'
import { money } from '../../../lib/format'
import {
  CreateCheckoutDocument,
  DeliveryOptionsDocument,
  QuoteCheckoutDocument,
  type QuoteCheckoutQuery,
} from '../../../generated/graphql'
import {
  checkoutAttempt,
  clearCheckoutAttempts,
  savedCheckoutAttempt,
  retireUnpaidAttempt,
  safeCheckoutUrl,
  type Attempt,
} from '../checkout-attempt'
import {
  deliveryAddressSchema,
  type DeliveryAddress,
  type DeliveryAddressForm as AddressFormValues,
} from '../delivery-address'
import { BackLink } from '../../../app/components/BackLink'
import { PageContainer } from '../../../app/components/PageContainer'
import { SummaryPanel } from '../../../app/components/SummaryPanel'
import { Button } from '../../../app/components/ui/button'
import { DeliveryDetails } from '../../orders/DeliveryDetails'
import { DeliveryAddressForm } from '../components/DeliveryAddressForm'
import { CheckoutReview } from '../components/CheckoutReview'

type CheckoutSessionProps = {
  userId?: string
  name: string
  email: string
  refreshSession: ReturnType<typeof authClient.useSession>['refetch']
}

type ReviewedQuote = {
  value: QuoteCheckoutQuery['quoteCheckout']
  address: DeliveryAddress
  snapshot: string
}

export function CheckoutPage() {
  const { data: session, refetch: refreshSession } = authClient.useSession()
  return (
    <DeliveryCheckout
      key={session?.user.id ?? ''}
      userId={session?.user.id}
      name={session?.user.name ?? ''}
      email={session?.user.email ?? ''}
      refreshSession={refreshSession}
    />
  )
}
function DeliveryCheckout({ userId, name, email, refreshSession }: CheckoutSessionProps) {
  const items = useCartStore((state) => state.items)
  const cartState = useCartStore()
  const ready = checkoutCartReady(cartState)
  const navigate = useNavigate()
  const client = useApolloClient()
  const [attempt, setAttempt] = useState<Attempt | undefined>(() =>
    userId ? savedCheckoutAttempt(userId) : undefined,
  )
  const [quote, setQuote] = useState<ReviewedQuote>()
  const [message, setMessage] = useState('')
  const [reviewing, setReviewing] = useState(false)
  const submissionPending = useRef(false)
  const quoteGeneration = useRef(0)
  const isMounted = useRef(true)
  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [userId])
  const [createCheckout, { loading: creatingPayment }] = useMutation(CreateCheckoutDocument, {
    fetchPolicy: 'no-cache',
  })
  const deliveryOptionsQuery = useQuery(DeliveryOptionsDocument, {
    fetchPolicy: 'no-cache',
    skip: !userId || !!attempt,
  })
  const form = useForm<AddressFormValues, unknown, DeliveryAddress>({
    resolver: zodResolver(deliveryAddressSchema),
    defaultValues: {
      recipientName: name,
      phone: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      region: '',
      postalCode: '',
      countryCode: '',
    },
  })
  const lines = items.map(({ id, quantity }) => ({ bookId: id, quantity }))
  const lineSnapshot = JSON.stringify({ lines, revision: cartState.revision })
  useEffect(
    () =>
      useCartStore.subscribe((state, previous) => {
        const snapshot = (lines: typeof state.items) =>
          JSON.stringify(lines.map(({ id, quantity }) => ({ id, quantity })))
        if (
          snapshot(state.items) !== snapshot(previous.items) ||
          state.revision !== previous.revision ||
          state.status !== previous.status
        ) {
          quoteGeneration.current++
          setQuote(undefined)
        }
      }),
    [],
  )
  const validQuote = ready && quote && quote.snapshot === lineSnapshot
  function invalidateQuote() {
    quoteGeneration.current++
    setQuote(undefined)
  }
  async function reviewOrder(address: DeliveryAddress) {
    if (submissionPending.current || reviewing || !ready) return
    if (!deliveryOptionsQuery.data?.deliveryOptions.countryCodes.includes(address.countryCode)) {
      form.setError('countryCode', { message: 'Choose a supported country.' })
      return
    }
    const requestGeneration = ++quoteGeneration.current
    setMessage('')
    setReviewing(true)
    try {
      const result = await client.query({
        query: QuoteCheckoutDocument,
        variables: { input: { items: lines, deliveryAddress: address } },
        fetchPolicy: 'no-cache',
      })
      if (
        !isMounted.current ||
        requestGeneration !== quoteGeneration.current ||
        JSON.stringify({
          lines: useCartStore
            .getState()
            .items.map(({ id, quantity }) => ({ bookId: id, quantity })),
          revision: useCartStore.getState().revision,
        }) !== lineSnapshot ||
        !checkoutCartReady(useCartStore.getState())
      )
        return
      if (!result.data?.quoteCheckout) throw new Error('Quote unavailable. Please review again.')
      setQuote({ value: result.data.quoteCheckout, address, snapshot: lineSnapshot })
    } catch (error) {
      if (isMounted.current && requestGeneration === quoteGeneration.current)
        setMessage(error instanceof Error ? error.message : 'Quote unavailable. Please try again.')
    } finally {
      if (isMounted.current) setReviewing(false)
    }
  }
  async function submitPayment() {
    if (!userId || submissionPending.current || creatingPayment || (!attempt && !validQuote)) return
    submissionPending.current = true
    setMessage('')
    const current =
      attempt ??
      checkoutAttempt(userId, items, {
        cartRevision: cartState.revision,
        deliveryAddress: quote!.address,
        expectedDeliveryFeeCents: quote!.value.deliveryFeeCents,
        expectedTotalCents: quote!.value.totalCents,
      })
    setAttempt(current)
    try {
      const result = await createCheckout({
        context: { headers: { 'X-Cart-Account': userId } },
        variables: {
          input: {
            items: current.lines.map(({ id, quantity }) => ({ bookId: id, quantity })),
            requestKey: current.requestKey,
            deliveryAddress: current.deliveryAddress,
            expectedDeliveryFeeCents: current.expectedDeliveryFeeCents,
            expectedTotalCents: current.expectedTotalCents,
            cartRevision: current.cartRevision,
          },
        },
      })
      if (!isMounted.current) return
      const outcome = result.data?.createCheckout
      if (!outcome)
        throw new Error(
          'Payment setup could not be confirmed. Check Orders before beginning another attempt.',
        )
      checkoutAttempt(userId, current.lines, current, outcome.order.id)
      retireUnpaidAttempt(userId, outcome.order)
      if (outcome.checkoutUrl) {
        if (!safeCheckoutUrl(outcome.checkoutUrl))
          throw new Error('Payment link unavailable. Check Orders to recover this attempt.')
        window.location.assign(outcome.checkoutUrl)
      } else navigate(`/checkout/return/${outcome.order.id}`)
    } catch (error) {
      if (!isMounted.current) return
      if (CombinedGraphQLErrors.is(error)) {
        const code = error.errors[0]?.extensions?.code
        if (code === 'UNAUTHENTICATED') {
          void useCartStore.getState().identify(undefined)
          clearCheckoutAttempts(userId)
          await client.clearStore()
          if (!isMounted.current) return
          await refreshSession({ query: { disableCookieCache: true } })
          if (!isMounted.current) return
          navigate(signInPath('/checkout'), { replace: true })
          return
        }
        if (code === 'CONFLICT' || code === 'CART_CONFLICT') {
          clearCheckoutAttempts(userId)
          setAttempt(undefined)
          invalidateQuote()
          form.reset(current.deliveryAddress)
          setMessage(
            code === 'CART_CONFLICT'
              ? 'Your bag changed elsewhere. Review the current bag and order again.'
              : 'Prices or delivery settings changed. Review order again and explicitly confirm the new total.',
          )
          if (code === 'CART_CONFLICT') await useCartStore.getState().refresh()
          return
        }
      }
      setMessage(
        error instanceof Error
          ? error.message
          : 'Payment setup could not be confirmed. Retry this exact attempt or check Orders.',
      )
    } finally {
      submissionPending.current = false
    }
  }
  if (!ready && !attempt && cartState.status !== 'guest')
    return (
      <PageContainer className="py-24">
        <h1 className="font-serif text-4xl">Your bag needs attention</h1>
        <p className="mt-4">
          Wait for your bag to load and save, and correct unavailable selections before checkout.
        </p>
        <Link to="/cart" className="mt-4 block underline">
          Back to bag
        </Link>
      </PageContainer>
    )
  if (!items.length && !attempt)
    return (
      <PageContainer className="py-24 text-center">
        <h1 className="font-serif text-4xl">Your bag is empty</h1>
        <Link to="/books">Browse books</Link>
      </PageContainer>
    )
  return (
    <PageContainer className="checkout-shell py-12 sm:py-20">
      <BackLink to="/cart">Back to bag</BackLink>
      <div className="mt-8 grid gap-12 lg:grid-cols-[1fr_340px]">
        <div>
          <h1 className="font-serif text-5xl">Checkout</h1>
          <p className="mt-5 text-sm text-muted-foreground">
            Books delivered to your saved destination. Pay securely through Stripe hosted test
            checkout.
          </p>
          <p className="mt-4">
            {name} · {email}
          </p>
          {message && (
            <p role="alert" className="mt-5 text-destructive">
              {message}
            </p>
          )}
          {attempt ? (
            <section className="mt-8 space-y-5" aria-label="Interrupted checkout">
              <p>
                Your previous payment setup may have created an order. Retry its exact saved
                destination and amount, or inspect Orders before beginning another attempt.
              </p>
              <DeliveryDetails
                delivery={{
                  address: attempt.deliveryAddress,
                  shipment: null,
                  shippedAt: null,
                  deliveredAt: null,
                }}
                subtotalCents={attempt.expectedTotalCents - attempt.expectedDeliveryFeeCents}
                deliveryFeeCents={attempt.expectedDeliveryFeeCents}
                totalCents={attempt.expectedTotalCents}
                status="SUBMITTED"
              />
              <Button disabled={creatingPayment} onClick={() => void submitPayment()}>
                {creatingPayment ? 'Opening payment…' : 'Retry payment setup'}
              </Button>
              <Link className="block underline" to="/account/orders">
                Inspect Orders
              </Link>
              <Button
                variant="ghost"
                disabled={creatingPayment}
                onClick={() => {
                  clearCheckoutAttempts(userId)
                  setAttempt(undefined)
                  invalidateQuote()
                  setMessage(
                    'Review a new order only after checking Orders for your earlier attempt.',
                  )
                }}
              >
                Begin another attempt after checking Orders
              </Button>
            </section>
          ) : validQuote ? (
            <CheckoutReview
              quote={quote.value}
              address={quote.address}
              paymentLoading={creatingPayment}
              onEditAddress={invalidateQuote}
              onContinuePayment={() => void submitPayment()}
            />
          ) : (
            <DeliveryAddressForm
              form={form}
              deliveryOptions={deliveryOptionsQuery.data?.deliveryOptions}
              optionsLoading={deliveryOptionsQuery.loading}
              optionsError={deliveryOptionsQuery.error}
              paymentLoading={creatingPayment}
              reviewing={reviewing}
              onReview={reviewOrder}
              onInvalidate={invalidateQuote}
              onRetryOptions={() => void deliveryOptionsQuery.refetch()}
            />
          )}
          <p className="mt-5 text-xs text-muted-foreground">
            Card details are handled by Stripe in test mode.
          </p>
          <Link className="mt-4 block underline" to="/account/orders">
            Recover an interrupted payment in Orders
          </Link>
        </div>
        <SummaryPanel title="Your order">
          <div className="mt-6 space-y-4">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between gap-4 text-sm">
                <span>
                  {item.quantity} × <span className="font-serif">{item.title}</span>
                </span>
                <span>{money(item.priceCents * item.quantity)}</span>
              </div>
            ))}
          </div>
          <div className="mt-7 flex justify-between border-t pt-5">
            <span>Books subtotal</span>
            <span>{money(cartTotal(items))}</span>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Delivery is added at review. Final prices and availability are checked by the server.
          </p>
        </SummaryPanel>
      </div>
    </PageContainer>
  )
}
