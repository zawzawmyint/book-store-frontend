import { Search } from 'lucide-react'
import { IconAction } from '../../../app/components/IconAction'
import { BookCard } from './BookCard'
import { PAGE_SIZE } from '../catalog'
import { useCatalog } from '../use-catalog'
import { Button } from '../../../app/components/ui/button'
import { Input } from '../../../app/components/ui/input'
import { Alert, AlertDescription } from '../../../app/components/ui/alert'
import { Card, CardContent } from '../../../app/components/ui/card'
import { Skeleton } from '../../../app/components/ui/skeleton'

export function CatalogSection() {
  const {
    search,
    page,
    draft,
    setDraft,
    books,
    categories,
    total,
    loading,
    error,
    refetch,
    submitSearch,
    chooseCategory,
    changePage,
  } = useCatalog()

  return (
    <section id="collection" className="page-shell pt-16 sm:pt-24">
      <div className="mb-8 flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <p className="eyebrow mb-3">The collection / 01</p>
          <h1 className="font-serif text-4xl tracking-[-.04em] sm:text-5xl">All books</h1>
        </div>
        <p className="max-w-xs text-sm leading-6 text-muted-foreground">
          A small shelf of timeless favorites, waiting to be discovered again.
        </p>
      </div>
      {/* Filter by genre */}
      <div className="flex flex-col gap-5 border-y border-border py-5 lg:flex-row lg:items-center lg:justify-between">
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
                className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors ${active ? 'bg-primary text-primary-foreground hover:bg-primary' : 'bg-muted text-muted-foreground hover:bg-muted'}`}
              >
                {category}
              </Button>
            )
          })}
        </div>
        {/* Search form */}
        <form
          onSubmit={submitSearch}
          role="search"
          className="flex min-w-0 items-center gap-2 border-b border-control pb-2 lg:w-[250px]"
        >
          <Input
            aria-label="Search books"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Search title or author"
            className="min-w-0 border-0 bg-transparent px-0 py-0 text-sm outline-none placeholder:text-muted-foreground focus:border-0 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-4"
          />
          <IconAction label="Search books" type="submit" variant="ghost" className="text-primary">
            <Search aria-hidden="true" />
          </IconAction>
        </form>
      </div>
      <div className="mb-8 mt-6 flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {loading ? 'Finding stories…' : `${total ?? 0} ${total === 1 ? 'book' : 'books'} found`}
        </span>
        {search && (
          <Button
            type="button"
            onClick={() => chooseCategory('All books')}
            variant="ghost"
            className="h-auto p-0 font-semibold text-primary hover:bg-transparent hover:underline"
          >
            Clear search
          </Button>
        )}
      </div>
      {/* Error */}
      {error && (
        <Alert variant="destructive" className="rounded-sm p-5 text-destructive">
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
            <Skeleton key={i} className="h-96 rounded-none bg-muted" />
          ))}
        </div>
      )}
      {!loading && !error && books.length === 0 && (
        <Card className="rounded-sm border-0 bg-muted">
          <CardContent className="px-6 py-20 text-center">
            <p className="font-serif text-3xl">No books on this shelf.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Try another title, author, or genre.
            </p>
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
      {!loading && !error && (total || 0) > PAGE_SIZE && (
        <div className="mt-14 flex items-center justify-center gap-5">
          <Button
            type="button"
            variant="ghost"
            disabled={page === 0}
            onClick={() => changePage(page - 1)}
            className="h-auto p-0 text-sm font-semibold disabled:opacity-30"
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">Page {page + 1}</span>
          <Button
            type="button"
            variant="ghost"
            disabled={(page + 1) * PAGE_SIZE >= (total || 0)}
            onClick={() => changePage(page + 1)}
            className="h-auto p-0 text-sm font-semibold disabled:opacity-30"
          >
            Next
          </Button>
        </div>
      )}
    </section>
  )
}
