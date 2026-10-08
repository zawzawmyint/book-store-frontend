import { useEffect, useRef, useState } from 'react'
import { CombinedGraphQLErrors } from '@apollo/client'
import { useApolloClient, useMutation, useQuery } from '@apollo/client/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from 'react-router-dom'
import { authClient } from '../../../lib/auth-client'
import { signInPath } from '../../auth/return-to'
import { useCartStore } from '../../cart/cart-store'
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
  countryName,
  type DeliveryAddress,
  type DeliveryAddressForm,
} from '../delivery-address'
import { BackLink } from '../../../app/components/BackLink'
import { PageContainer } from '../../../app/components/PageContainer'
import { SummaryPanel } from '../../../app/components/SummaryPanel'
import { Button } from '../../../app/components/ui/button'
import { Input } from '../../../app/components/ui/input'
import { Label } from '../../../app/components/ui/label'
import { DeliveryDetails } from '../../orders/DeliveryDetails'
const fields = [
  { name: 'recipientName', label: 'Recipient name', max: 120 },
  { name: 'phone', label: 'Phone number', max: 32 },
  { name: 'addressLine1', label: 'Address line 1', max: 200 },
  { name: 'addressLine2', label: 'Address line 2 (optional)', max: 200 },
  { name: 'city', label: 'City', max: 100 },
  { name: 'region', label: 'Region (optional)', max: 100 },
  { name: 'postalCode', label: 'Postal code (optional)', max: 32 },
] as const
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
function DeliveryCheckout({
  userId,
  name,
  email,
  refreshSession,
}: {
  userId?: string
  name: string
  email: string
  refreshSession: ReturnType<typeof authClient.useSession>['refetch']
}) {
  const items = useCartStore((s) => s.items)
  const navigate = useNavigate(),
    client = useApolloClient()
  const [attempt, setAttempt] = useState<Attempt | undefined>(() =>
    userId ? savedCheckoutAttempt(userId) : undefined,
  )
  const [quote, setQuote] = useState<{
    value: QuoteCheckoutQuery['quoteCheckout']
    address: DeliveryAddress
    snapshot: string
  }>()
  const [message, setMessage] = useState('')
  const [reviewing, setReviewing] = useState(false)
  const busy = useRef(false),
    generation = useRef(0)
  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [userId])
  const [create, { loading }] = useMutation(CreateCheckoutDocument, { fetchPolicy: 'no-cache' })
  const options = useQuery(DeliveryOptionsDocument, {
    fetchPolicy: 'no-cache',
    skip: !userId || !!attempt,
  })
  const form = useForm<DeliveryAddressForm, unknown, DeliveryAddress>({
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
  const lineSnapshot = JSON.stringify(lines)
  useEffect(
    () =>
      useCartStore.subscribe((state, previous) => {
        const snapshot = (lines: typeof state.items) =>
          JSON.stringify(lines.map(({ id, quantity }) => ({ id, quantity })))
        if (snapshot(state.items) !== snapshot(previous.items)) {
          generation.current++
          setQuote(undefined)
        }
      }),
    [],
  )
  const validQuote = quote && quote.snapshot === lineSnapshot
  function invalidate() {
    generation.current++
    setQuote(undefined)
  }
  async function review(address: DeliveryAddress) {
    if (busy.current || reviewing || !items.length) return
    if (!options.data?.deliveryOptions.countryCodes.includes(address.countryCode)) {
      form.setError('countryCode', { message: 'Choose a supported country.' })
      return
    }
    const request = ++generation.current
    setMessage('')
    setReviewing(true)
    try {
      const result = await client.query({
        query: QuoteCheckoutDocument,
        variables: { input: { items: lines, deliveryAddress: address } },
        fetchPolicy: 'no-cache',
      })
      if (
        !alive.current ||
        request !== generation.current ||
        JSON.stringify(
          useCartStore.getState().items.map(({ id, quantity }) => ({ bookId: id, quantity })),
        ) !== lineSnapshot
      )
        return
      if (!result.data?.quoteCheckout) throw new Error('Quote unavailable. Please review again.')
      setQuote({ value: result.data.quoteCheckout, address, snapshot: lineSnapshot })
    } catch (error) {
      if (alive.current && request === generation.current)
        setMessage(error instanceof Error ? error.message : 'Quote unavailable. Please try again.')
    } finally {
      if (alive.current) setReviewing(false)
    }
  }
  async function submit() {
    if (!userId || busy.current || loading || (!attempt && !validQuote)) return
    busy.current = true
    setMessage('')
    const current =
      attempt ??
      checkoutAttempt(userId, items, {
        deliveryAddress: quote!.address,
        expectedDeliveryFeeCents: quote!.value.deliveryFeeCents,
        expectedTotalCents: quote!.value.totalCents,
      })
    setAttempt(current)
    try {
      const result = await create({
        variables: {
          input: {
            items: current.lines.map(({ id, quantity }) => ({ bookId: id, quantity })),
            requestKey: current.requestKey,
            deliveryAddress: current.deliveryAddress,
            expectedDeliveryFeeCents: current.expectedDeliveryFeeCents,
            expectedTotalCents: current.expectedTotalCents,
          },
        },
      })
      if (!alive.current) return
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
      if (!alive.current) return
      if (CombinedGraphQLErrors.is(error)) {
        const code = error.errors[0]?.extensions?.code
        if (code === 'UNAUTHENTICATED') {
          clearCheckoutAttempts(userId)
          await client.clearStore()
          if (!alive.current) return
          await refreshSession({ query: { disableCookieCache: true } })
          if (!alive.current) return
          navigate(signInPath('/checkout'), { replace: true })
          return
        }
        if (code === 'CONFLICT') {
          clearCheckoutAttempts(userId)
          setAttempt(undefined)
          invalidate()
          form.reset(current.deliveryAddress)
          setMessage(
            'Prices or delivery settings changed. Review order again and explicitly confirm the new total.',
          )
          return
        }
      }
      setMessage(
        error instanceof Error
          ? error.message
          : 'Payment setup could not be confirmed. Retry this exact attempt or check Orders.',
      )
    } finally {
      busy.current = false
    }
  }
  if (!items.length && !attempt)
    return (
      <PageContainer className="py-24 text-center">
        <h1 className="font-serif text-4xl">Your bag is empty</h1>
        <Link to="/">Browse books</Link>
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
              <Button disabled={loading} onClick={() => void submit()}>
                {loading ? 'Opening payment…' : 'Retry payment setup'}
              </Button>
              <Link className="block underline" to="/account/orders">
                Inspect Orders
              </Link>
              <Button
                variant="ghost"
                disabled={loading}
                onClick={() => {
                  clearCheckoutAttempts(userId)
                  setAttempt(undefined)
                  invalidate()
                  setMessage(
                    'Review a new order only after checking Orders for your earlier attempt.',
                  )
                }}
              >
                Begin another attempt after checking Orders
              </Button>
            </section>
          ) : validQuote ? (
            <section className="mt-8 space-y-5" aria-label="Reviewed order">
              <h2 className="font-semibold">Review your order</h2>
              <DeliveryDetails
                delivery={{
                  address: quote.address,
                  shipment: null,
                  shippedAt: null,
                  deliveredAt: null,
                }}
                subtotalCents={quote.value.subtotalCents}
                deliveryFeeCents={quote.value.deliveryFeeCents}
                totalCents={quote.value.totalCents}
                status="SUBMITTED"
              />
              <p className="text-sm">Review is not a reservation or delivery date guarantee.</p>
              <div className="grid gap-3 sm:flex sm:flex-wrap">
                <Button
                  className="min-h-11 sm:min-h-9"
                  variant="ghost"
                  disabled={loading}
                  onClick={invalidate}
                >
                  Edit address
                </Button>
                <Button className="min-h-11 sm:min-h-9" asChild variant="ghost">
                  <Link to="/cart">Edit cart</Link>
                </Button>
                <Button
                  className="min-h-11 sm:min-h-9"
                  disabled={loading}
                  onClick={() => void submit()}
                >
                  Continue to payment
                </Button>
              </div>
            </section>
          ) : (
            <form
              className="mt-8 space-y-5"
              onSubmit={(event) => void form.handleSubmit(review)(event)}
              onChange={invalidate}
            >
              <h2 className="font-semibold">Delivery address</h2>
              {options.loading && <p role="status">Loading delivery options…</p>}
              {options.error && (
                <p role="alert">
                  {options.error.message}
                  <Button type="button" variant="ghost" onClick={() => void options.refetch()}>
                    Retry delivery options
                  </Button>
                </p>
              )}
              <fieldset disabled={loading} className="space-y-4">
                {fields.map((field) => (
                  <div key={field.name}>
                    <Label htmlFor={field.name}>{field.label}</Label>
                    <Input
                      id={field.name}
                      type={field.name === 'phone' ? 'tel' : 'text'}
                      maxLength={field.max}
                      {...form.register(field.name)}
                      aria-invalid={!!form.formState.errors[field.name]}
                      aria-describedby={
                        form.formState.errors[field.name] ? `${field.name}-error` : undefined
                      }
                    />
                    {form.formState.errors[field.name] && (
                      <p role="alert" id={`${field.name}-error`}>
                        {form.formState.errors[field.name]?.message}
                      </p>
                    )}
                  </div>
                ))}
                <div>
                  <Label htmlFor="countryCode">Country</Label>
                  <select
                    id="countryCode"
                    className="h-10 w-full rounded-md border bg-background px-3"
                    {...form.register('countryCode')}
                    aria-invalid={!!form.formState.errors.countryCode}
                    aria-describedby={
                      form.formState.errors.countryCode ? 'country-error' : undefined
                    }
                  >
                    <option value="">Choose a country</option>
                    {options.data?.deliveryOptions.countryCodes.map((code) => (
                      <option key={code} value={code}>
                        {countryName(code)}
                      </option>
                    ))}
                  </select>
                  {form.formState.errors.countryCode && (
                    <p role="alert" id="country-error">
                      {form.formState.errors.countryCode.message}
                    </p>
                  )}
                </div>
              </fieldset>
              {options.data && (
                <p>
                  Delivery per order:{' '}
                  {options.data.deliveryOptions.feeCents === 0
                    ? 'Free delivery'
                    : money(options.data.deliveryOptions.feeCents)}
                </p>
              )}
              <Button
                type="submit"
                disabled={reviewing || options.loading || !!options.error || !options.data}
              >
                {reviewing ? 'Reviewing…' : 'Review order'}
              </Button>
            </form>
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
