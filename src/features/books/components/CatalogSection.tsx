import { localized, message as msg, t, useI18n } from '../../../lib/i18n'
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
import { BookLoader } from '../../../app/components/BookLoader'

export function CatalogSection() {
  useI18n()

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
      ? [
          {
            label: msg('storefront:searchValue', { value0: applied.search }),
            name: 'search',
            remove: { search: '' },
          },
        ]
      : []),
    ...(applied.genre
      ? [
          {
            label: msg('storefront:genreValue', { value0: applied.genre }),
            name: 'genre',
            remove: { genre: '' },
          },
        ]
      : []),
    ...(applied.inStock
      ? [{ label: msg('storefront:inStockOnly'), name: 'availability', remove: { inStock: false } }]
      : []),
    ...(price
      ? [
          {
            label: msg('storefront:priceValueValue', {
              value0:
                applied.minPrice === undefined ? t('common:labelAny') : money(applied.minPrice),
              value1:
                applied.maxPrice === undefined ? t('common:labelAny') : money(applied.maxPrice),
            }),
            name: msg('storefront:priceRange'),
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
          aria-label={t('storefront:catalogFilters')}
          className="space-y-5 lg:sticky lg:top-[calc(var(--storefront-header-height,5rem)+1.5rem)] lg:w-[280px] lg:shrink-0 lg:self-start lg:max-h-[calc(100dvh-var(--storefront-header-height,5rem)-3rem)] lg:overflow-y-auto lg:border-r lg:border-border lg:pe-6"
        >
          <div>
            <h1 className="font-serif text-2xl tracking-[-.03em]">{t('storefront:allBooks')}</h1>
            <p role="status" className="mt-2 text-sm text-muted-foreground">
              {localized(
                loading
                  ? t('storefront:findingStories')
                  : error
                    ? t('storefront:resultsUnavailable')
                    : books.length
                      ? t('storefront:showingRange', {
                          value0: page * PAGE_SIZE + 1,
                          value1: page * PAGE_SIZE + books.length,
                          value2: t('common:bookCount', { count: total ?? 0 }),
                        })
                      : t('storefront:booksFound', { count: total ?? 0 }),
              )}
            </p>
          </div>
          <form onSubmit={submitSearch} role="search">
            <label htmlFor="catalog-search" className="mb-2 block text-sm font-semibold">
              {t('storefront:searchBooks')}
            </label>
            <div className="catalog-search-field flex items-center rounded-sm border border-control focus-within:border-primary focus-within:ring-1 focus-within:ring-inset focus-within:ring-ring">
              <Input
                id="catalog-search"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                maxLength={100}
                placeholder={t('storefront:searchTitleOrAuthor')}
                className="min-h-11 min-w-0 border-0 bg-transparent px-3 py-3 text-sm focus-visible:ring-0"
              />
              <IconAction
                label={t('storefront:searchBooks')}
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
              {t('storefront:sortBy')}
            </label>
            <select
              id="catalog-sort"
              value={applied.sort}
              onChange={(event) => update({ sort: event.target.value as CatalogState['sort'] })}
              className="min-h-11 w-full rounded-sm border border-control bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-ring"
            >
              {Object.entries(catalogSorts).map(([value, label]) => (
                <option key={value} value={value}>
                  {localized(label)}
                </option>
              ))}
            </select>
          </div>
          <CatalogFilters applied={applied} genres={genres} update={update} />
          {(chips.length > 0 || applied.sort !== 'default') && (
            <div
              className="flex flex-wrap items-center gap-2"
              aria-label={t('storefront:activeFilters')}
            >
              {chips.map((chip) => (
                <Button
                  key={chip.name}
                  variant="secondary"
                  className="h-auto min-h-11 max-w-full gap-2 whitespace-normal rounded-full px-3 py-2 text-start text-xs"
                  onClick={() => update(chip.remove)}
                  aria-label={t('storefront:removeValueFilter', { value0: chip.name })}
                >
                  <span className="break-words">{localized(chip.label)}</span>
                  <X className="size-3 shrink-0" aria-hidden="true" />
                </Button>
              ))}
              <Button variant="ghost" className="min-h-11 text-xs underline" onClick={clearAll}>
                {t('storefront:clearAll')}
              </Button>
            </div>
          )}
        </aside>
        <div
          id="catalog-results"
          role="region"
          aria-label={t('storefront:bookResults')}
          tabIndex={-1}
          className="min-w-0 flex-1"
        >
          {error && (
            <Alert variant="destructive">
              <AlertDescription>
                {t('storefront:theShelvesCouldNotLoad')}
                <Button
                  variant="ghost"
                  onClick={() => refetch()}
                  className="h-auto p-0 font-bold underline"
                >
                  {t('storefront:tryAgain')}
                </Button>
                .
              </AlertDescription>
            </Alert>
          )}
          {loading && (
            <>
              <BookLoader label={t('storefront:openingYourShelf')} />
              <div className="grid grid-cols-1 gap-5 min-[375px]:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }, (_, index) => (
                  <Skeleton key={index} className="h-96 rounded-none bg-muted" />
                ))}
              </div>
            </>
          )}
          {!loading && !error && books.length === 0 && (
            <div className="rounded-sm bg-muted px-6 py-20 text-center">
              <p className="font-serif text-3xl">{t('storefront:noBooksOnThisShelf')}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {t('storefront:tryAnotherTitleAuthorGenreOrPriceRange')}
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
              aria-label={t('storefront:catalogPages')}
              className="mt-14 flex items-center justify-center gap-4"
            >
              <Button
                variant="ghost"
                disabled={page === 0}
                onClick={() => changePage(page - 1)}
                className="min-h-11 px-2 text-sm"
              >
                {t('storefront:previous')}
              </Button>
              <span className="text-sm text-muted-foreground">
                {t('storefront:pageValueOfValue', { value0: page + 1, value1: pages })}
              </span>
              <Button
                variant="ghost"
                disabled={page + 1 >= pages}
                onClick={() => changePage(page + 1)}
                className="min-h-11 px-2 text-sm"
              >
                {t('storefront:next')}
              </Button>
            </nav>
          )}
        </div>
      </div>
    </section>
  )
}
