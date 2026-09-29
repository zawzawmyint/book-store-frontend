import { useState } from 'react'
import type { FormEvent } from 'react'
import { useQuery } from '@apollo/client/react'
import { ArrowRight, Search, Sparkles } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { BookCard } from '../components/BookCard'
import { BookCover } from '../components/BookCover'
import { BOOKS_QUERY } from '../../../lib/graphql'

const categories = [
  'All books',
  'Classic Fiction',
  'Science Fiction',
  'Gothic Fiction',
  'Children’s Literature',
  'Fantasy',
  'Adventure',
]

export function HomePage() {
  const [params, setParams] = useSearchParams()
  const search = params.get('search') || ''
  const page = Math.max(0, Number(params.get('page') || 0) || 0)
  const [draft, setDraft] = useState(search)
  const { data, loading, error, refetch } = useQuery(BOOKS_QUERY, {
    variables: { search, limit: 12, offset: page * 12 },
  })
  const books = data?.books.items || []

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = draft.trim()
    setParams(value ? { search: value } : {})
  }

  function chooseCategory(category: string) {
    const value = category === 'All books' ? '' : category
    setDraft(value)
    setParams(value ? { search: value } : {})
  }

  return (
    <>
      <section className="relative overflow-hidden bg-[#e7e9df]">
        <div className="mx-auto grid max-w-[1280px] items-center gap-10 px-5 py-14 sm:px-10 md:grid-cols-2 md:py-20 lg:py-24">
          <div className="relative z-10 max-w-xl">
            <p className="mb-5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.22em] text-[#557760]">
              <Sparkles size={15} /> Curated for curious minds
            </p>
            <h1 className="font-serif text-[clamp(3.5rem,6vw,6.4rem)] leading-[.96] tracking-[-.055em] text-[#233a2e]">
              Find your next <em className="font-normal text-[#9b714f]">chapter.</em>
            </h1>
            <p className="mt-7 max-w-md text-base leading-7 text-[#5f6d62]">
              Thoughtful stories for slow mornings, long journeys, and everywhere in between. Take a
              look around.
            </p>
            <a
              href="#collection"
              className="mt-9 inline-flex items-center gap-3 rounded-sm bg-[#2c5844] px-6 py-4 text-xs font-bold uppercase tracking-[.17em] text-white transition-colors hover:bg-[#204936]"
            >
              Explore the collection <ArrowRight size={17} />
            </a>
          </div>
          <div className="relative mx-auto flex h-[340px] w-full max-w-[520px] items-center justify-center sm:h-[430px]">
            <div className="absolute right-[12%] top-[9%] h-[79%] w-[45%] rotate-[13deg] opacity-85">
              <BookCover id="2" title="Pride and Prejudice" author="Jane Austen" />
            </div>
            <div className="absolute left-[10%] top-[12%] h-[79%] w-[45%] -rotate-[12deg] opacity-90">
              <BookCover id="4" title="Jane Eyre" author="Charlotte Brontë" />
            </div>
            <div className="absolute left-[29%] top-[3%] h-[86%] w-[45%] rotate-[-1deg] drop-shadow-2xl">
              <BookCover id="1" title="The Great Gatsby" author="F. Scott Fitzgerald" />
            </div>
            <div className="absolute bottom-0 left-[20%] right-[10%] h-4 rounded-[50%] bg-[#748375]/20 blur-xl" />
          </div>
        </div>
        <span
          className="absolute -bottom-24 -left-24 size-72 rounded-full border-[55px] border-white/20"
          aria-hidden="true"
        />
      </section>

      <section id="collection" className="mx-auto max-w-[1280px] px-5 pt-16 sm:px-10 sm:pt-24">
        <div className="mb-8 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[.23em] text-[#a67d58]">
              The collection / 01
            </p>
            <h2 className="font-serif text-4xl tracking-[-.04em] sm:text-5xl">
              Stories to get lost in
            </h2>
          </div>
          <p className="max-w-xs text-sm leading-6 text-[#7b7d74]">
            A small shelf of timeless favorites, waiting to be discovered again.
          </p>
        </div>
        <div className="flex flex-col gap-5 border-y border-[#dedbd3] py-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2" aria-label="Filter by genre">
            {categories.map((category) => {
              const active = category === 'All books' ? !search : search === category
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => chooseCategory(category)}
                  className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors ${active ? 'bg-[#2e5b46] text-white' : 'bg-[#ebe9e2] text-[#677166] hover:bg-[#deded5]'}`}
                >
                  {category}
                </button>
              )
            })}
          </div>
          <form
            onSubmit={submit}
            role="search"
            className="flex min-w-0 items-center gap-2 border-b border-[#acb4a8] pb-2 lg:w-[250px]"
          >
            <Search size={18} className="shrink-0 text-[#748277]" />
            <input
              aria-label="Search books"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Search title or author"
              className="w-full bg-transparent text-sm outline-none placeholder:text-[#a3a69e]"
            />
            <button type="submit" className="text-xs font-bold text-[#2e6249]">
              Go
            </button>
          </form>
        </div>
        <div className="mb-8 mt-6 flex items-center justify-between text-xs text-[#8b8e85]">
          <span>{loading ? 'Finding stories…' : `${data?.books.total ?? 0} books found`}</span>
          {search && (
            <button
              type="button"
              onClick={() => chooseCategory('All books')}
              className="font-semibold text-[#31694e] hover:underline"
            >
              Clear search
            </button>
          )}
        </div>
        {error && (
          <div
            role="alert"
            className="rounded-sm border border-[#e5c9c0] bg-[#fff2ed] p-5 text-sm text-[#a14134]"
          >
            The shelves could not load.{' '}
            <button onClick={() => refetch()} className="font-bold underline">
              Try again
            </button>
            .
          </div>
        )}
        {loading && (
          <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="h-96 animate-pulse bg-[#e6e3dc]" />
            ))}
          </div>
        )}
        {!loading && !error && books.length === 0 && (
          <div className="rounded-sm bg-[#eeece5] px-6 py-20 text-center">
            <p className="font-serif text-3xl">No books on this shelf.</p>
            <p className="mt-2 text-sm text-[#81857b]">Try another title, author, or genre.</p>
          </div>
        )}
        {!loading && !error && books.length > 0 && (
          <div className="grid gap-x-7 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
            {books.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        )}
        {!loading && !error && (data?.books.total || 0) > 12 && (
          <div className="mt-14 flex items-center justify-center gap-5">
            <button
              disabled={page === 0}
              onClick={() =>
                setParams(search ? { search, page: String(page - 1) } : { page: String(page - 1) })
              }
              className="text-sm font-semibold disabled:opacity-30"
            >
              Previous
            </button>
            <span className="text-sm text-[#8b8e85]">Page {page + 1}</span>
            <button
              disabled={(page + 1) * 12 >= (data?.books.total || 0)}
              onClick={() =>
                setParams(search ? { search, page: String(page + 1) } : { page: String(page + 1) })
              }
              className="text-sm font-semibold disabled:opacity-30"
            >
              Next
            </button>
          </div>
        )}
      </section>
      <section className="mx-auto mt-24 max-w-[1280px] px-5 sm:px-10">
        <div className="grid gap-8 bg-[#244b3b] p-8 text-[#f6f0e4] sm:p-12 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[.2em] text-[#c5d2ad]">
              A little more about this store
            </p>
            <h2 className="font-serif text-3xl sm:text-4xl">Good books. Clear ideas.</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[#d3ded1]">
              Find your next read among our selected titles, from familiar classics to unexpected
              favorites.
            </p>
          </div>
          <Link
            to="/cart"
            className="inline-flex items-center gap-3 text-xs font-bold uppercase tracking-[.16em] text-[#f3e6bf] hover:underline"
          >
            View your bag <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </>
  )
}
