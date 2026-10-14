import { Search, X } from 'lucide-react'
import { IconAction } from '../../../app/components/IconAction'
import { BookCard } from './BookCard'
import { CatalogFilters } from './CatalogFilters'
import { PAGE_SIZE, catalogSorts, type CatalogState } from '../catalog'
import { useCatalog } from '../use-catalog'
import { useCatalogScroll } from '../catalog-navigation'
import { money } from '../../../lib/format'
import { Button } from '../../../app/components/ui/button'
import { Input } from '../../../app/components/ui/input'
import { Alert, AlertDescription } from '../../../app/components/ui/alert'
import { Skeleton } from '../../../app/components/ui/skeleton'

export function CatalogSection() {
  const catalog = useCatalog()
  const {
    applied,
    page,
    draft,
    setDraft,
    books,
    genres,
    total,
    loading,
    error,
    refetch,
    submitSearch,
    update,
    changePage,
    clearAll,
  } = catalog
  useCatalogScroll(
    !loading &&
      !error &&
      total !== undefined &&
      page <= Math.max(0, Math.ceil(total / PAGE_SIZE) - 1),
  )
  const price = applied.minPrice !== undefined || applied.maxPrice !== undefined
  const chips: { label: string; name: string; remove: Partial<CatalogState> }[] = [
    ...(applied.search
      ? [{ label: `Search: ${applied.search}`, name: 'search', remove: { search: '' } }]
      : []),
    ...(applied.genre
      ? [{ label: `Genre: ${applied.genre}`, name: 'genre', remove: { genre: '' } }]
      : []),
    ...(applied.inStock
      ? [{ label: 'In stock only', name: 'availability', remove: { inStock: false } }]
      : []),
    ...(price
      ? [
          {
            label: `Price: ${applied.minPrice === undefined ? 'Any' : money(applied.minPrice)} – ${applied.maxPrice === undefined ? 'Any' : money(applied.maxPrice)}`,
            name: 'price range',
            remove: { minPrice: undefined, maxPrice: undefined },
          },
        ]
      : []),
  ]
  const pages = Math.max(1, Math.ceil((total ?? 0) / PAGE_SIZE))
  return (
    <section id="collection" className="page-shell pt-6 sm:pt-8">
      <div className="space-y-6 lg:flex lg:items-start lg:gap-8 lg:space-y-0">
        <aside
          aria-label="Catalog filters"
          className="space-y-5 lg:sticky lg:top-[calc(var(--storefront-header-height,5rem)+1.5rem)] lg:w-[280px] lg:shrink-0 lg:self-start lg:max-h-[calc(100dvh-var(--storefront-header-height,5rem)-3rem)] lg:overflow-y-auto lg:border-r lg:border-border lg:pr-6"
        >
          <div>
            <h1 className="font-serif text-2xl tracking-[-.03em]">All books</h1>
            <p role="status" className="mt-2 text-sm text-muted-foreground">
              {loading
                ? 'Finding stories…'
                : error
                  ? 'Results unavailable'
                  : books.length
                    ? `Showing ${page * PAGE_SIZE + 1}–${page * PAGE_SIZE + books.length} of ${total ?? 0} books`
                    : `${total ?? 0} books found`}
            </p>
          </div>
          <form onSubmit={submitSearch} role="search">
            <label htmlFor="catalog-search" className="mb-2 block text-sm font-semibold">
              Search books
            </label>
            <div className="catalog-search-field flex items-center rounded-sm border border-control focus-within:border-primary focus-within:ring-1 focus-within:ring-inset focus-within:ring-ring">
              <Input
                id="catalog-search"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                maxLength={100}
                placeholder="Search title or author"
                className="min-h-11 min-w-0 border-0 bg-transparent px-3 py-3 text-sm focus-visible:ring-0"
              />
              <IconAction
                label="Search books"
                type="submit"
                variant="ghost"
                className="text-primary"
              >
                <Search aria-hidden="true" />
              </IconAction>
            </div>
          </form>
          <div className="hidden lg:block">
            <label htmlFor="catalog-sort" className="mb-3 block text-sm font-semibold">
              Sort by
            </label>
            <select
              id="catalog-sort"
              value={applied.sort}
              onChange={(event) => update({ sort: event.target.value as CatalogState['sort'] })}
              className="min-h-11 w-full rounded-sm border border-control bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-ring"
            >
              {Object.entries(catalogSorts).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <CatalogFilters applied={applied} genres={genres} update={update} />
          {(chips.length > 0 || applied.sort !== 'default') && (
            <div className="flex flex-wrap items-center gap-2" aria-label="Active filters">
              {chips.map((chip) => (
                <Button
                  key={chip.name}
                  variant="secondary"
                  className="h-auto min-h-11 max-w-full gap-2 whitespace-normal rounded-full px-3 py-2 text-left text-xs"
                  onClick={() => update(chip.remove)}
                  aria-label={`Remove ${chip.name} filter`}
                >
                  <span className="break-words">{chip.label}</span>
                  <X className="size-3 shrink-0" aria-hidden="true" />
                </Button>
              ))}
              <Button variant="ghost" className="min-h-11 text-xs underline" onClick={clearAll}>
                Clear all
              </Button>
            </div>
          )}
        </aside>
        <div
          id="catalog-results"
          role="region"
          aria-label="Book results"
          tabIndex={-1}
          className="min-w-0 flex-1"
        >
          {error && (
            <Alert variant="destructive">
              <AlertDescription>
                The shelves could not load.{' '}
                <Button
                  variant="ghost"
                  onClick={() => refetch()}
                  className="h-auto p-0 font-bold underline"
                >
                  Try again
                </Button>
                .
              </AlertDescription>
            </Alert>
          )}
          {loading && (
            <div className="grid grid-cols-1 gap-5 min-[375px]:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }, (_, index) => (
                <Skeleton key={index} className="h-96 rounded-none bg-muted" />
              ))}
            </div>
          )}
          {!loading && !error && books.length === 0 && (
            <div className="rounded-sm bg-muted px-6 py-20 text-center">
              <p className="font-serif text-3xl">No books on this shelf.</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Try another title, author, genre, or price range.
              </p>
            </div>
          )}
          {!loading && !error && books.length > 0 && (
            <div className="grid grid-cols-1 gap-x-5 gap-y-12 min-[375px]:grid-cols-2 xl:grid-cols-3">
              {books.map((book) => (
                <BookCard key={book.id} book={book} />
              ))}
            </div>
          )}
          {!loading && !error && (total ?? 0) > PAGE_SIZE && (
            <nav
              aria-label="Catalog pages"
              className="mt-14 flex items-center justify-center gap-4"
            >
              <Button
                variant="ghost"
                disabled={page === 0}
                onClick={() => changePage(page - 1)}
                className="min-h-11 px-2 text-sm"
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page + 1} of {pages}
              </span>
              <Button
                variant="ghost"
                disabled={page + 1 >= pages}
                onClick={() => changePage(page + 1)}
                className="min-h-11 px-2 text-sm"
              >
                Next
              </Button>
            </nav>
          )}
        </div>
      </div>
    </section>
  )
}
