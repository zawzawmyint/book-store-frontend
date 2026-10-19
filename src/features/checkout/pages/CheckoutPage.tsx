import { errorMessage } from '../../../lib/i18n/errors'
import { localized, message as msg, t, useI18n } from '../../../lib/i18n'
import { useEffect, useRef, useState } from 'react'
import { CombinedGraphQLErrors } from '@apollo/client'
import { useApolloClient, useMutation, useQuery } from '@apollo/client/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from 'react-router-dom'
import { authClient } from '../../../lib/auth-client'
import { signInPath } from '../../auth/return-to'
import { checkoutCartReady, useCartStore } from '../../cart/cart-store'
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
import { Button } from '../../../app/components/ui/button'
import { CheckoutDestination } from '../components/CheckoutDestination'
import { CheckoutSummary, CheckoutTotals } from '../components/CheckoutSummary'
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
  useI18n()

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
  useI18n()

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
      form.setError('countryCode', { message: msg('storefront:chooseASupportedCountry') })
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
      if (!result.data?.quoteCheckout)
        throw new Error(msg('storefront:quoteUnavailablePleaseReviewAgain'))
      setQuote({ value: result.data.quoteCheckout, address, snapshot: lineSnapshot })
    } catch (error) {
      if (isMounted.current && requestGeneration === quoteGeneration.current)
        setMessage(
          errorMessage(error, 'storefront:quoteUnavailablePleaseTryAgain', {
            BAD_USER_INPUT: 'storefront:quoteValidationFailed',
          }),
        )
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
          msg('storefront:paymentSetupCouldNotBeConfirmedCheckOrdersBeforeBeginningAnother'),
        )
      checkoutAttempt(userId, current.lines, current, outcome.order.id)
      retireUnpaidAttempt(userId, outcome.order)
      if (outcome.checkoutUrl) {
        if (!safeCheckoutUrl(outcome.checkoutUrl))
          throw new Error(msg('storefront:paymentLinkUnavailableCheckOrdersToRecoverThisAttempt'))
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
              ? msg('storefront:yourBagChangedElsewhereReviewTheCurrentBagAndOrderAgain')
              : msg(
                  'storefront:pricesOrDeliverySettingsChangedReviewOrderAgainAndExplicitlyConfirm',
                ),
          )
          if (code === 'CART_CONFLICT') await useCartStore.getState().refresh()
          return
        }
      }
      setMessage(
        errorMessage(error, 'storefront:paymentSetupCouldNotBeConfirmedRetryThisExactAttemptOr'),
      )
    } finally {
      submissionPending.current = false
    }
  }
  if (!ready && !attempt && cartState.status !== 'guest')
    return (
      <PageContainer className="py-24">
        <h1 className="font-serif text-4xl">{t('storefront:yourBagNeedsAttention')}</h1>
        <p className="mt-4">{t('storefront:waitForYourBagToLoadAndSaveAndCorrectUnavailable')}</p>
        <Link to="/cart" className="mt-4 block underline">
          {t('storefront:backToBag')}
        </Link>
      </PageContainer>
    )
  if (!items.length && !attempt)
    return (
      <PageContainer className="py-24 text-center">
        <h1 className="font-serif text-4xl">{t('storefront:yourBagIsEmpty')}</h1>
        <Link to="/books">{t('storefront:browseBooks')}</Link>
      </PageContainer>
    )
  return (
    <PageContainer className="checkout-shell py-12 sm:py-20">
      <BackLink to="/cart">{t('storefront:backToBag')}</BackLink>
      <div className="mt-7 border-b border-border pb-7">
        <p className="eyebrow mb-3">{t('storefront:oneStepCloserToAGoodBook')}</p>
        <h1 className="font-serif text-5xl">{t('storefront:checkout')}</h1>
        <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">
          {t('storefront:enterADeliveryAddressReviewYourTotalThenContinueToStripe')}
        </p>
        <p className="mt-3 break-words text-sm">
          <bdi dir="auto">{localized(name)}</bdi> · <bdi dir="ltr">{localized(email)}</bdi>
        </p>
      </div>
      <nav aria-label={t('storefront:checkoutProgress')} className="py-6">
        <ol className="flex flex-wrap gap-x-6 gap-y-3 text-sm">
          {[t('storefront:delivery'), t('storefront:review'), t('storefront:payment')].map(
            (step, index) => {
              const current = index === (attempt ? 2 : validQuote ? 1 : 0)
              return (
                <li
                  key={step}
                  aria-current={current ? 'step' : undefined}
                  className={`flex items-center gap-2 ${current ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}
                >
                  <span
                    aria-hidden="true"
                    className={`flex h-7 w-7 items-center justify-center rounded-full border ${current ? 'border-primary bg-primary text-primary-foreground' : 'border-border'}`}
                  >
                    {localized(index + 1)}
                  </span>
                  {localized(step)}
                  {index === 2 && (
                    <span className="sr-only">{t('storefront:throughStripeTestCheckout')}</span>
                  )}
                </li>
              )
            },
          )}
        </ol>
      </nav>
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-12">
        <CheckoutSummary
          items={items}
          savedAttempt={!!attempt}
          amounts={
            attempt
              ? {
                  subtotalCents: attempt.expectedTotalCents - attempt.expectedDeliveryFeeCents,
                  deliveryFeeCents: attempt.expectedDeliveryFeeCents,
                  totalCents: attempt.expectedTotalCents,
                }
              : validQuote
                ? quote.value
                : undefined
          }
        />
        <div className="min-w-0 lg:col-start-1 lg:row-start-1">
          {message && (
            <p role="alert" className="mt-5 text-destructive">
              {localized(message)}
            </p>
          )}
          {attempt ? (
            <section className="space-y-5" aria-label={t('storefront:interruptedCheckout')}>
              <h2 className="font-serif text-2xl">{t('storefront:yourSavedPaymentAttempt')}</h2>
              <p>{t('storefront:yourPreviousPaymentSetupMayHaveCreatedAnOrderRetryIts')}</p>
              <CheckoutDestination address={attempt.deliveryAddress} />
              <CheckoutTotals
                amounts={{
                  subtotalCents: attempt.expectedTotalCents - attempt.expectedDeliveryFeeCents,
                  deliveryFeeCents: attempt.expectedDeliveryFeeCents,
                  totalCents: attempt.expectedTotalCents,
                }}
              />
              <Button
                className="min-h-11 w-full"
                disabled={creatingPayment}
                onClick={() => void submitPayment()}
              >
                {localized(
                  creatingPayment
                    ? t('storefront:openingPayment')
                    : t('storefront:retryPaymentSetup'),
                )}
              </Button>
              <Link className="block underline" to="/account/orders">
                {t('storefront:inspectOrders')}
              </Link>
              <Button
                variant="ghost"
                className="min-h-11 whitespace-normal px-3 py-2 text-sm"
                disabled={creatingPayment}
                onClick={() => {
                  clearCheckoutAttempts(userId)
                  setAttempt(undefined)
                  invalidateQuote()
                  setMessage(msg('storefront:reviewANewOrderOnlyAfterCheckingOrdersForYourEarlier'))
                }}
              >
                {t('storefront:beginAnotherAttemptAfterCheckingOrders')}
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
            {t('storefront:cardDetailsAreHandledByStripeInTestMode')}
          </p>
          <Link className="mt-4 block underline" to="/account/orders">
            {t('storefront:recoverAnInterruptedPaymentInOrders')}
          </Link>
        </div>
      </div>
    </PageContainer>
  )
}
