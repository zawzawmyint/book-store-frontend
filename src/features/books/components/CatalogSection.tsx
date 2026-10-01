import { useState } from 'react'
import type { FormEvent } from 'react'
import { useQuery } from '@apollo/client/react'
import { Search } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { BookCard } from './BookCard'
import { BOOKS_QUERY } from '../../../lib/graphql'
import { PAGE_SIZE } from '../catalog'
import { Button } from '../../../app/components/ui/button'
import { Input } from '../../../app/components/ui/input'
import { Alert, AlertDescription } from '../../../app/components/ui/alert'
import { Card, CardContent } from '../../../app/components/ui/card'
import { Skeleton } from '../../../app/components/ui/skeleton'

export function CatalogSection() {
  const [params, setParams] = useSearchParams()
  const search = params.get('search') || ''
  const page = Math.max(0, Number(params.get('page') || 0) || 0)
  const [draft, setDraft] = useState(search)
  const { data, loading, error, refetch } = useQuery(BOOKS_QUERY, {
    variables: { search, limit: PAGE_SIZE, offset: page * PAGE_SIZE },
  })
  const books = data?.books.items || []
  const categories = ['All books', ...(data?.genres || [])]

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
    <section id="collection" className="page-shell pt-16 sm:pt-24">
      <div className="mb-8 flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <p className="eyebrow mb-3">The collection / 01</p>
          <h2 className="font-serif text-4xl tracking-[-.04em] sm:text-5xl">
            Stories to get lost in
          </h2>
        </div>
        <p className="max-w-xs text-sm leading-6 text-[#7b7d74]">
          A small shelf of timeless favorites, waiting to be discovered again.
        </p>
      </div>
      {/* Filter by genre */}
      <div className="flex flex-col gap-5 border-y border-[#dedbd3] py-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by genre">
          {categories.map((category) => {
            const active = category === 'All books' ? !search : search === category
            return (
              <Button
                key={category}
                type="button"
                onClick={() => chooseCategory(category)}
                variant="ghost"
                aria-pressed={active}
                className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors ${active ? 'bg-[#2e5b46] text-white hover:bg-[#2e5b46]' : 'bg-[#ebe9e2] text-[#677166] hover:bg-[#deded5]'}`}
              >
                {category}
              </Button>
            )
          })}
        </div>
        {/* Search form */}
        <form
          onSubmit={submit}
          role="search"
          className="flex min-w-0 items-center gap-2 border-b border-[#acb4a8] pb-2 lg:w-[250px]"
        >
          <Search size={18} className="shrink-0 text-[#748277]" />
          <Input
            aria-label="Search books"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Search title or author"
            className="min-w-0 border-0 bg-transparent px-0 py-0 text-sm outline-none placeholder:text-[#a3a69e] focus:border-0 focus-visible:ring-0"
          />
          <Button
            type="submit"
            variant="ghost"
            className="h-auto p-0 text-xs font-bold text-[#2e6249] hover:bg-transparent"
          >
            Go
          </Button>
        </form>
      </div>
      <div className="mb-8 mt-6 flex items-center justify-between text-xs text-[#8b8e85]">
        <span>
          {loading
            ? 'Finding stories…'
            : `${data?.books.total ?? 0} ${data?.books.total === 1 ? 'book' : 'books'} found`}
        </span>
        {search && (
          <Button
            type="button"
            onClick={() => chooseCategory('All books')}
            variant="ghost"
            className="h-auto p-0 font-semibold text-[#31694e] hover:bg-transparent hover:underline"
          >
            Clear search
          </Button>
        )}
      </div>
      {/* Error */}
      {error && (
        <Alert variant="destructive" className="rounded-sm p-5 text-[#a14134]">
          <AlertDescription>
            The shelves could not load.{' '}
            <Button
              type="button"
              variant="ghost"
              onClick={() => refetch()}
              className="h-auto p-0 font-bold underline hover:bg-transparent"
            >
              Try again
            </Button>
            .
          </AlertDescription>
        </Alert>
      )}
      {loading && (
        <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-96 rounded-none bg-[#e6e3dc]" />
          ))}
        </div>
      )}
      {!loading && !error && books.length === 0 && (
        <Card className="rounded-sm border-0 bg-[#eeece5]">
          <CardContent className="px-6 py-20 text-center">
            <p className="font-serif text-3xl">No books on this shelf.</p>
            <p className="mt-2 text-sm text-[#81857b]">Try another title, author, or genre.</p>
          </CardContent>
        </Card>
      )}
      {/* Books list */}
      {!loading && !error && books.length > 0 && (
        <div className="grid gap-x-7 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
          {books.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      )}
      {/* Pagination */}
      {!loading && !error && (data?.books.total || 0) > PAGE_SIZE && (
        <div className="mt-14 flex items-center justify-center gap-5">
          <Button
            type="button"
            variant="ghost"
            disabled={page === 0}
            onClick={() =>
              setParams(search ? { search, page: String(page - 1) } : { page: String(page - 1) })
            }
            className="h-auto p-0 text-sm font-semibold disabled:opacity-30"
          >
            Previous
          </Button>
          <span className="text-sm text-[#8b8e85]">Page {page + 1}</span>
          <Button
            type="button"
            variant="ghost"
            disabled={(page + 1) * PAGE_SIZE >= (data?.books.total || 0)}
            onClick={() =>
              setParams(search ? { search, page: String(page + 1) } : { page: String(page + 1) })
            }
            className="h-auto p-0 text-sm font-semibold disabled:opacity-30"
          >
            Next
          </Button>
        </div>
      )}
    </section>
  )
}
