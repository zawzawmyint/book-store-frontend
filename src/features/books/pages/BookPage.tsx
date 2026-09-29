import { useQuery } from '@apollo/client/react'
import { ArrowLeft, ArrowRight, Check, ShoppingBag } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { BookCover } from '../components/BookCover'
import { useCart } from '../../cart/cart-context'
import { BOOK_QUERY } from '../../../lib/graphql'
import { money } from '../../../lib/format'

export function BookPage() {
  const { id = '' } = useParams()
  const { data, loading, error, refetch } = useQuery(BOOK_QUERY, {
    variables: { id },
  })
  const { add, items } = useCart()
  const book = data?.book
  const inBag = items.find((item) => item.id === id)?.quantity || 0

  if (loading)
    return (
      <div className="mx-auto max-w-[1280px] px-5 py-24 text-[#6e796e] sm:px-10">
        Opening this book…
      </div>
    )
  if (error)
    return (
      <div className="mx-auto max-w-[1280px] px-5 py-24 sm:px-10">
        <p role="alert">We could not load this book.</p>
        <button onClick={() => refetch()} className="mt-4 font-semibold underline">
          Try again
        </button>
      </div>
    )
  if (!book)
    return (
      <div className="mx-auto max-w-[1280px] px-5 py-24 sm:px-10">
        <h1 className="font-serif text-4xl">Book not found</h1>
        <Link to="/" className="mt-5 inline-block text-[#2e6a4f] underline">
          Back to the collection
        </Link>
      </div>
    )

  return (
    <div className="mx-auto max-w-[1280px] px-5 py-9 sm:px-10 sm:py-14">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[.15em] text-[#718174] hover:text-[#2c6347]"
      >
        <ArrowLeft size={16} /> All books
      </Link>
      <div className="mt-9 grid gap-12 md:grid-cols-2 md:gap-16 lg:gap-24">
        <div className="grid min-h-[450px] place-items-center bg-[#e9e5dc] p-12 sm:min-h-[600px]">
          <BookCover id={book.id} title={book.title} author={book.author} large />
        </div>
        <div className="flex flex-col justify-center pb-8">
          <p className="text-xs font-bold uppercase tracking-[.22em] text-[#ab815c]">
            {book.genre}
          </p>
          <h1 className="mt-5 font-serif text-[clamp(3rem,5vw,5rem)] leading-[1.03] tracking-[-.05em]">
            {book.title}
          </h1>
          <p className="mt-5 font-serif text-xl italic text-[#7e8277]">by {book.author}</p>
          <div className="my-9 h-px bg-[#dedbd2]" />
          <p className="text-base leading-8 text-[#6b756b]">{book.description}</p>
          <p className="mt-9 text-2xl font-semibold">{money(book.priceCents)}</p>
          <p
            className={`mt-2 flex items-center gap-2 text-sm ${book.stock ? 'text-[#478164]' : 'text-[#a15b4b]'}`}
          >
            <Check size={15} /> {book.stock ? `${book.stock} available` : 'Currently sold out'}
          </p>
          <button
            type="button"
            onClick={() => add(book)}
            disabled={!book.stock || inBag >= book.stock}
            className="mt-8 inline-flex w-full items-center justify-center gap-3 bg-[#2b5843] px-7 py-4 text-xs font-bold uppercase tracking-[.17em] text-white transition-colors hover:bg-[#1e4331] disabled:cursor-not-allowed disabled:bg-[#a5aca3]"
          >
            <ShoppingBag size={17} />{' '}
            {inBag >= book.stock && book.stock ? 'Maximum in bag' : 'Add to bag'}
          </button>
          {inBag > 0 && (
            <Link
              to="/cart"
              className="mt-4 inline-flex items-center justify-center gap-2 text-sm font-semibold text-[#2f7252] hover:underline"
            >
              {inBag} in your bag · View bag <ArrowRight size={16} />
            </Link>
          )}
          <div className="mt-12 grid grid-cols-2 gap-6 border-t border-[#dedbd2] pt-6 text-xs leading-5 text-[#7c8579]">
            <span>
              <strong className="mb-1 block text-[#354e3d]">Carefully chosen</strong> A shelf of
              enduring favorites.
            </span>
            <span>
              <strong className="mb-1 block text-[#354e3d]">Demo checkout</strong> No payment is
              collected.
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
