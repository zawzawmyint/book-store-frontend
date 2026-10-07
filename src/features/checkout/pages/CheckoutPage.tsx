import { useRef, useState } from 'react'
import { useApolloClient, useMutation } from '@apollo/client/react'
import { ArrowRight, LockKeyhole } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { authClient } from '../../../lib/auth-client'
import { signInPath } from '../../auth/return-to'
import { useCartStore } from '../../cart/cart-store'
import { cartTotal } from '../../cart/cart'
import { money } from '../../../lib/format'
import { CreateCheckoutDocument } from '../../../generated/graphql'
import { checkoutAttempt, retireUnpaidAttempt, safeCheckoutUrl } from '../checkout-attempt'
import { BackLink } from '../../../app/components/BackLink'
import { PageContainer } from '../../../app/components/PageContainer'
import { SummaryPanel } from '../../../app/components/SummaryPanel'
import { Button } from '../../../app/components/ui/button'
import { Alert, AlertDescription } from '../../../app/components/ui/alert'
import { Card, CardContent } from '../../../app/components/ui/card'

export function CheckoutPage() {
  const items = useCartStore((state) => state.items)
  const total = cartTotal(items)
  const { data: session, refetch: refreshSession } = authClient.useSession()
  const navigate = useNavigate()
  const [redirectError, setRedirectError] = useState('')
  const submitting = useRef(false)
  const client = useApolloClient()
  const [createCheckout, { loading, error }] = useMutation(CreateCheckoutDocument)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!items.length || loading || submitting.current || !session?.user.id) return
    submitting.current = true
    setRedirectError('')
    const attempt = checkoutAttempt(session.user.id, items)
    try {
      const result = await createCheckout({
        variables: {
          input: {
            items: items.map(({ id, quantity }) => ({ bookId: id, quantity })),
            requestKey: attempt.requestKey,
          },
        },
      })
      if (result.data?.createCheckout) {
        const { order, checkoutUrl } = result.data.createCheckout
        checkoutAttempt(session.user.id, items, order.id)
        retireUnpaidAttempt(session.user.id, order)
        if (checkoutUrl) {
          if (!safeCheckoutUrl(checkoutUrl))
            throw new Error('Payment link unavailable. Check your orders to recover this attempt.')
          window.location.assign(checkoutUrl)
        } else navigate(`/checkout/return/${order.id}`)
      }
    } catch (caught) {
      if (caught instanceof Error && 'errors' in caught) {
        const errors = (caught as { errors?: Array<{ extensions?: { code?: string } }> }).errors
        if (errors?.some((entry) => entry.extensions?.code === 'UNAUTHENTICATED')) {
          await client.clearStore()
          await refreshSession({ query: { disableCookieCache: true } })
          navigate(signInPath('/checkout'), { replace: true })
        }
      }
      setRedirectError(
        caught instanceof Error
          ? caught.message
          : 'Payment could not be confirmed. Retry with this bag or recover in Orders.',
      )
    } finally {
      submitting.current = false
    }
  }

  if (!items.length)
    return (
      <PageContainer className="message-shell py-24 text-center">
        <h1 className="font-serif text-4xl">Your bag is empty</h1>
        <Button asChild variant="ghost" className="mt-6 text-primary underline">
          <Link to="/">Browse books</Link>
        </Button>
      </PageContainer>
    )

  return (
    <PageContainer className="checkout-shell py-12 sm:py-20">
      <BackLink to="/cart">Back to bag</BackLink>
      <div className="mt-8 grid gap-12 lg:grid-cols-[1fr_340px] lg:gap-20">
        <div>
          <p className="eyebrow mb-3">Almost there</p>
          <h1 className="font-serif text-5xl tracking-[-.05em]">Checkout</h1>
          <p className="mt-5 max-w-lg text-sm leading-6 text-muted-foreground">
            Pay securely through Stripe hosted test checkout. Your account details are saved with
            your order. Delivery is not integrated. Completed means handling finished.
          </p>
          <form onSubmit={submit} className="mt-10 space-y-6">
            <Card className="border-border bg-muted shadow-none">
              <CardContent className="p-5 text-sm">
                <p className="font-semibold">{session?.user.name}</p>
                <p className="mt-1 text-muted-foreground">{session?.user.email}</p>
              </CardContent>
            </Card>
            {(error || redirectError) && (
              <Alert
                variant="destructive"
                className="border-destructive bg-destructive-muted text-destructive"
              >
                <AlertDescription>{redirectError || error?.message}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Opening payment…' : 'Continue to payment'} <ArrowRight size={17} />
            </Button>
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <LockKeyhole size={15} /> Card details are handled by Stripe in test mode.
            </p>
          </form>
          <Link to="/account/orders" className="mt-4 block text-sm text-primary underline">
            Recover an interrupted payment in Orders
          </Link>
        </div>
        <SummaryPanel title="Your order">
          <div className="mt-6 space-y-4">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between gap-4 text-sm">
                <span className="text-muted-foreground">
                  {item.quantity} × <span className="font-serif">{item.title}</span>
                </span>
                <span className="shrink-0 font-medium">
                  {money(item.priceCents * item.quantity)}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-7 flex justify-between border-t border-border pt-5 font-semibold">
            <span>Total</span>
            <span>{money(total)}</span>
          </div>
          <p className="mt-4 text-xs leading-5 text-muted-foreground">
            Final prices and availability are checked by the server when you place the order.
          </p>
        </SummaryPanel>
      </div>
    </PageContainer>
  )
}
