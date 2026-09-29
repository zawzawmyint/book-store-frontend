import { ArrowLeft, ArrowRight, Minus, Plus, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { BookCover } from '../../books/components/BookCover'
import { useCart } from '../cart-context'
import { money } from '../../../lib/format'

export function CartPage() {
  const { items, count, total, update } = useCart()
  return (
    <div className="mx-auto max-w-[1280px] px-5 py-12 sm:px-10 sm:py-20">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[.15em] text-[#718174] hover:text-[#2c6347]"
      >
        <ArrowLeft size={16} /> Continue browsing
      </Link>
      <div className="mt-7 flex items-end justify-between border-b border-[#dcd9d0] pb-7">
        <div>
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[.2em] text-[#a67d58]">
            Your selection
          </p>
          <h1 className="font-serif text-5xl tracking-[-.05em]">Your bag</h1>
        </div>
        <span className="text-sm text-[#8a8e84]">
          {count} {count === 1 ? 'book' : 'books'}
        </span>
      </div>
      {items.length === 0 ? (
        <div className="py-28 text-center">
          <p className="font-serif text-3xl">Nothing here yet.</p>
          <p className="mt-3 text-sm text-[#81877d]">
            There are good stories waiting on the shelves.
          </p>
          <Link
            to="/"
            className="mt-8 inline-flex items-center gap-2 bg-[#2c5844] px-6 py-4 text-xs font-bold uppercase tracking-[.17em] text-white"
          >
            Browse books <ArrowRight size={17} />
          </Link>
        </div>
      ) : (
        <div className="grid gap-12 pt-9 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-16">
          <div className="divide-y divide-[#e0ddd5]">
            {items.map((item) => (
              <div key={item.id} className="flex gap-5 py-7 first:pt-0 sm:gap-8">
                <Link
                  to={`/books/${item.id}`}
                  className="w-24 shrink-0 bg-[#e6e2d9] p-2 sm:w-32 sm:p-3"
                >
                  <BookCover id={item.id} title={item.title} author={item.author} />
                </Link>
                <div className="flex min-w-0 flex-1 flex-col">
                  <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#ab815c]">
                    {item.genre}
                  </p>
                  <Link
                    to={`/books/${item.id}`}
                    className="mt-2 font-serif text-xl leading-tight hover:underline sm:text-2xl"
                  >
                    {item.title}
                  </Link>
                  <p className="mt-1 text-sm text-[#85877d]">{item.author}</p>
                  <p className="mt-3 text-sm font-semibold">{money(item.priceCents)}</p>
                  <div className="mt-auto flex items-end justify-between pt-5">
                    <div className="inline-flex items-center border border-[#cfcfc3]">
                      <button
                        aria-label={`Remove one ${item.title}`}
                        onClick={() => update(item.id, item.quantity - 1)}
                        className="p-2 hover:bg-[#eeece6]"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="min-w-8 text-center text-sm">{item.quantity}</span>
                      <button
                        aria-label={`Add one ${item.title}`}
                        disabled={item.quantity >= item.stock}
                        onClick={() => update(item.id, item.quantity + 1)}
                        className="p-2 hover:bg-[#eeece6] disabled:opacity-30"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    <button
                      aria-label={`Remove ${item.title} from bag`}
                      onClick={() => update(item.id, 0)}
                      className="p-2 text-[#9b9f95] hover:text-[#a34c3b]"
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <aside className="h-fit bg-[#eeece5] p-7 sm:p-9">
            <p className="font-serif text-2xl">Order summary</p>
            <div className="mt-7 flex justify-between border-b border-[#d8d5ca] pb-5 text-sm">
              <span className="text-[#737c71]">
                Subtotal · {count} {count === 1 ? 'book' : 'books'}
              </span>
              <strong>{money(total)}</strong>
            </div>
            <div className="mt-5 flex justify-between text-base font-semibold">
              <span>Total</span>
              <span>{money(total)}</span>
            </div>
            <p className="mt-3 text-xs leading-5 text-[#8b8d82]">
              Submitting an order request does not collect payment or shipping details.
            </p>
            <Link
              to="/checkout"
              className="mt-7 flex items-center justify-center gap-3 bg-[#2b5843] px-5 py-4 text-xs font-bold uppercase tracking-[.15em] text-white hover:bg-[#1e4331]"
            >
              Continue to checkout <ArrowRight size={17} />
            </Link>
          </aside>
        </div>
      )}
    </div>
  )
}
