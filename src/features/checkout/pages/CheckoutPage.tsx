import { useState } from 'react'
import { useApolloClient, useMutation } from '@apollo/client/react'
import { ArrowRight, LockKeyhole } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { authClient } from '../../../lib/auth-client'
import { signInPath } from '../../auth/return-to'
import { useCartStore } from '../../cart/cart-store'
import { cartTotal } from '../../cart/cart'
import { money } from '../../../lib/format'
import { PLACE_ORDER } from '../../../lib/graphql'
import type { OrderReceipt } from '../../../lib/graphql'
import { BackLink } from '../../../app/components/BackLink'
import { PageContainer } from '../../../app/components/PageContainer'
import { SummaryPanel } from '../../../app/components/SummaryPanel'
import { OrderReceiptView } from '../components/OrderReceiptView'
import { Button } from '../../../app/components/ui/button'
import { Alert, AlertDescription } from '../../../app/components/ui/alert'
import { Card, CardContent } from '../../../app/components/ui/card'

export function CheckoutPage() {
  const items = useCartStore((state) => state.items)
  const clear = useCartStore((state) => state.clear)
  const total = cartTotal(items)
  const { data: session } = authClient.useSession()
  const navigate = useNavigate()
  const [receipt, setReceipt] = useState<OrderReceipt | null>(null)
  const client = useApolloClient()
  const [placeOrder, { loading, error }] = useMutation(PLACE_ORDER)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!items.length || loading) return
    try {
      const result = await placeOrder({
        variables: {
          input: {
            items: items.map(({ id, quantity }) => ({ bookId: id, quantity })),
          },
        },
      })
      if (result.data?.placeOrder) {
        setReceipt(result.data.placeOrder)
        clear()
        await client.clearStore()
      }
    } catch (caught) {
      if (caught instanceof Error && 'errors' in caught) {
        const errors = (caught as { errors?: Array<{ extensions?: { code?: string } }> }).errors
        if (errors?.some((entry) => entry.extensions?.code === 'UNAUTHENTICATED')) {
          await client.clearStore()
          navigate(signInPath('/checkout'), { replace: true })
        }
      }
      /* Apollo exposes the error below. The cart remains intact. */
    }
  }

  if (receipt) return <OrderReceiptView receipt={receipt} name={session?.user.name || 'reader'} />

  if (!items.length)
    return (
      <PageContainer className="message-shell py-24 text-center">
        <h1 className="font-serif text-4xl">Your bag is empty</h1>
        <Button asChild variant="ghost" className="mt-6 text-[#2c6a4f] underline">
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
          <p className="mt-5 max-w-lg text-sm leading-6 text-[#778073]">
            Your account details will be used for this order request. Payment and delivery are not
            available.
          </p>
          <form onSubmit={submit} className="mt-10 space-y-6">
            <Card className="border-[#d8d5ca] bg-[#eeeae0] shadow-none">
              <CardContent className="p-5 text-sm">
                <p className="font-semibold">{session?.user.name}</p>
                <p className="mt-1 text-[#687267]">{session?.user.email}</p>
              </CardContent>
            </Card>
            {error && (
              <Alert variant="destructive" className="border-[#e5c9c0] bg-[#fff2ed] text-[#a14134]">
                <AlertDescription>{error.message}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Saving your request…' : 'Submit order request'} <ArrowRight size={17} />
            </Button>
            <p className="flex items-center gap-2 text-xs text-[#8a8d83]">
              <LockKeyhole size={15} /> No payment information is requested or stored.
            </p>
          </form>
        </div>
        <SummaryPanel title="Your order">
          <div className="mt-6 space-y-4">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between gap-4 text-sm">
                <span className="text-[#707a6e]">
                  {item.quantity} × {item.title}
                </span>
                <span className="shrink-0 font-medium">
                  {money(item.priceCents * item.quantity)}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-7 flex justify-between border-t border-[#d7d5ca] pt-5 font-semibold">
            <span>Total</span>
            <span>{money(total)}</span>
          </div>
          <p className="mt-4 text-xs leading-5 text-[#8a8d83]">
            Final prices and availability are checked by the server when you place the order.
          </p>
        </SummaryPanel>
      </div>
    </PageContainer>
  )
}
