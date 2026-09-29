import { useState } from 'react'
import type { FormEvent } from 'react'
import { useApolloClient, useMutation } from '@apollo/client/react'
import { ArrowLeft, ArrowRight, CheckCircle2, LockKeyhole } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useCart } from '../../cart/cart-context'
import { money } from '../../../lib/format'
import { PLACE_ORDER } from '../../../lib/graphql'
import type { OrderReceipt } from '../../../lib/graphql'

export function CheckoutPage() {
  const { items, total, clear } = useCart()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [receipt, setReceipt] = useState<OrderReceipt | null>(null)
  const client = useApolloClient()
  const [placeOrder, { loading, error }] = useMutation(PLACE_ORDER)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!items.length || loading) return
    try {
      const result = await placeOrder({
        variables: {
          input: {
            customerName: name,
            email,
            items: items.map(({ id, quantity }) => ({ bookId: id, quantity })),
          },
        },
      })
      if (result.data?.placeOrder) {
        setReceipt(result.data.placeOrder)
        clear()
        await client.clearStore()
      }
    } catch {
      /* Apollo exposes the error below. The cart remains intact. */
    }
  }

  if (receipt)
    return (
      <div className="mx-auto max-w-[720px] px-5 py-24 text-center sm:px-10">
        <CheckCircle2 size={54} strokeWidth={1.3} className="mx-auto text-[#2d7651]" />
        <p className="mt-8 text-[11px] font-bold uppercase tracking-[.2em] text-[#a67d58]">
          Order request received
        </p>
        <h1 className="mt-3 font-serif text-5xl tracking-[-.05em]">
          Thank you, {name.trim().split(' ')[0]}.
        </h1>
        <p className="mt-5 text-sm leading-6 text-[#6f796d]">
          Your order request is saved. No payment was collected.
        </p>
        <div className="mx-auto mt-9 max-w-md bg-[#eceae2] p-7 text-left">
          <div className="flex justify-between border-b border-[#d8d5ca] pb-4 text-sm">
            <span>Order number</span>
            <strong>#{receipt.id.padStart(5, '0')}</strong>
          </div>
          {receipt.items.map((item) => (
            <div key={item.title} className="mt-4 flex justify-between gap-3 text-sm">
              <span>
                {item.quantity} × {item.title}
              </span>
              <span>{money(item.quantity * item.unitPriceCents)}</span>
            </div>
          ))}
          <div className="mt-5 flex justify-between border-t border-[#d8d5ca] pt-4 font-semibold">
            <span>Total</span>
            <span>{money(receipt.totalCents)}</span>
          </div>
        </div>
        <Link
          to="/"
          className="mt-9 inline-flex items-center gap-2 text-sm font-semibold text-[#28674a] hover:underline"
        >
          Back to the shelves <ArrowRight size={16} />
        </Link>
      </div>
    )

  if (!items.length)
    return (
      <div className="mx-auto max-w-[720px] px-5 py-24 text-center sm:px-10">
        <h1 className="font-serif text-4xl">Your bag is empty</h1>
        <Link to="/" className="mt-6 inline-block text-[#2c6a4f] underline">
          Browse books
        </Link>
      </div>
    )

  return (
    <div className="mx-auto max-w-[1100px] px-5 py-12 sm:px-10 sm:py-20">
      <Link
        to="/cart"
        className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[.15em] text-[#718174] hover:text-[#2c6347]"
      >
        <ArrowLeft size={16} /> Back to bag
      </Link>
      <div className="mt-8 grid gap-12 lg:grid-cols-[1fr_340px] lg:gap-20">
        <div>
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[.2em] text-[#a67d58]">
            Almost there
          </p>
          <h1 className="font-serif text-5xl tracking-[-.05em]">Checkout</h1>
          <p className="mt-5 max-w-lg text-sm leading-6 text-[#778073]">
            Add your details to submit an order request. Payment and delivery are not available.
          </p>
          <form onSubmit={submit} className="mt-10 space-y-6">
            <div>
              <label
                htmlFor="customer-name"
                className="mb-2 block text-xs font-bold uppercase tracking-[.15em]"
              >
                Full name
              </label>
              <input
                id="customer-name"
                autoComplete="name"
                required
                maxLength={120}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Your name"
                className="w-full border border-[#cfcfc5] bg-[#fbfaf6] px-4 py-4 text-sm outline-none focus:border-[#32734f]"
              />
            </div>
            <div>
              <label
                htmlFor="customer-email"
                className="mb-2 block text-xs font-bold uppercase tracking-[.15em]"
              >
                Email address
              </label>
              <input
                id="customer-email"
                type="email"
                autoComplete="email"
                required
                maxLength={254}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className="w-full border border-[#cfcfc5] bg-[#fbfaf6] px-4 py-4 text-sm outline-none focus:border-[#32734f]"
              />
            </div>
            {error && (
              <div
                role="alert"
                className="border border-[#e5c9c0] bg-[#fff2ed] p-4 text-sm text-[#a14134]"
              >
                {error.message}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-3 bg-[#2b5843] px-6 py-4 text-xs font-bold uppercase tracking-[.17em] text-white hover:bg-[#1e4331] disabled:opacity-60"
            >
              {loading ? 'Saving your request…' : 'Submit order request'} <ArrowRight size={17} />
            </button>
            <p className="flex items-center gap-2 text-xs text-[#8a8d83]">
              <LockKeyhole size={15} /> No payment information is requested or stored.
            </p>
          </form>
        </div>
        <aside className="h-fit bg-[#eeece5] p-7 sm:p-9">
          <p className="font-serif text-2xl">Your order</p>
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
        </aside>
      </div>
    </div>
  )
}
