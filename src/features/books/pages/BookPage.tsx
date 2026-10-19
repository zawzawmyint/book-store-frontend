import { localized, t, useI18n } from '../../../lib/i18n'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useQuery } from '@apollo/client/react'
import { ArrowRight, Check, ShoppingBag } from 'lucide-react'
import { Link, useLocation, useNavigationType, useParams } from 'react-router-dom'
import { readCatalogReturn } from '../catalog-navigation'
import { BookCover } from '../components/BookCover'
import { BookCard } from '../components/BookCard'
import { BookRail } from '../components/BookRail'
import { cartBlocked, useCartStore } from '../../cart/cart-store'
import { BookDocument, RelatedBooksDocument, type BookQuery } from '../../../generated/graphql'
import { money } from '../../../lib/format'
import { BackLink } from '../../../app/components/BackLink'
import { PageContainer } from '../../../app/components/PageContainer'
import { Button } from '../../../app/components/ui/button'
import { Alert, AlertDescription } from '../../../app/components/ui/alert'
import { Badge } from '../../../app/components/ui/badge'
import { Card } from '../../../app/components/ui/card'
import { Separator } from '../../../app/components/ui/separator'
import { Skeleton } from '../../../app/components/ui/skeleton'
import { BookLoader } from '../../../app/components/BookLoader'

type Book = NonNullable<BookQuery['book']>

function PurchaseSummary({ book }: { book: Book }) {
  useI18n()

  const add = useCartStore((state) => state.add)
  const blocked = useCartStore(cartBlocked)
  const owner = useCartStore((state) => state.owner)
  const line = useCartStore((state) => state.items.find((item) => item.id === book.id))
  const inBag = line?.quantity ?? 0
  const stock = owner != null && line ? Math.min(book.stock, line.stock) : book.stock
  const unavailable = owner != null && line?.available === false
  const remaining = unavailable ? 0 : Math.max(0, Math.min(10, stock) - inBag)
  const [quantity, setQuantity] = useState(1)
  const [previousRemaining, setPreviousRemaining] = useState(remaining)
  const [pending, setPending] = useState(false)
  const [added, setAdded] = useState(0)
  const attempt = useRef(0)
  const submitting = useRef(false)
  const selected = remaining ? Math.min(quantity, remaining) : 0
  if (remaining !== previousRemaining) {
    setPreviousRemaining(remaining)
    setQuantity(remaining ? Math.min(quantity, remaining) : 1)
  }

  useEffect(() => {
    const generation = attempt
    const unsubscribe = useCartStore.subscribe((state, previous) => {
      if (state.owner !== previous.owner) {
        attempt.current++
        submitting.current = false
        setPending(false)
        setQuantity(1)
        setAdded(0)
      }
      if (!state.items.some((item) => item.id === book.id && item.quantity > 0)) setAdded(0)
    })
    return () => {
      unsubscribe()
      generation.current++
    }
  }, [book.id])

  async function addBook() {
    if (submitting.current || blocked || !selected) return
    const token = ++attempt.current
    const owner = useCartStore.getState().owner
    submitting.current = true
    setAdded(0)
    setPending(true)
    try {
      const accepted = await add(book, selected)
      if (
        attempt.current === token &&
        useCartStore.getState().owner === owner &&
        accepted &&
        useCartStore.getState().items.some((item) => item.id === book.id && item.quantity > 0)
      )
        setAdded(selected)
    } catch {
      // Cart recovery is presented by the shared cart status.
    } finally {
      if (attempt.current === token) {
        submitting.current = false
        setPending(false)
      }
    }
  }

  return (
    <form
      aria-label={t('storefront:bookPurchase')}
      onSubmit={(event) => {
        event.preventDefault()
        void addBook()
      }}
      className="min-w-0"
    >
      <Link
        to={`/books?${new URLSearchParams({ genre: book.genre })}`}
        className="inline-flex min-h-11 items-center break-words text-xs font-bold uppercase tracking-[.22em] text-copper hover:underline"
      >
        <bdi dir="auto">{localized(book.genre)}</bdi>
      </Link>
      <h1 className="mt-2 break-words font-serif text-[clamp(2rem,3.5vw,3rem)] leading-[1.08] tracking-[-.04em]">
        <bdi dir="auto">{localized(book.title)}</bdi>
      </h1>
      <p className="mt-4 break-words font-serif text-xl italic text-muted-foreground">
        {t('storefront:by')}
        <Link
          to={`/books?${new URLSearchParams({ search: book.author })}`}
          className="underline underline-offset-4 hover:text-primary"
        >
          <bdi dir="auto">{localized(book.author)}</bdi>
        </Link>
      </p>
      <Separator className="my-6 bg-border" />
      <p className="text-2xl font-semibold">
        {localized(money(book.priceCents))}{' '}
        <span className="text-sm font-normal text-muted-foreground">{t('storefront:each')}</span>
      </p>
      <Badge
        variant="outline"
        className={`mt-2 flex w-fit items-center gap-2 border-0 px-0 py-0 text-sm font-normal ${stock && !unavailable ? 'text-primary' : 'text-destructive'}`}
      >
        <Check size={15} />
        {localized(
          unavailable
            ? t('storefront:currentlyUnavailable')
            : stock
              ? t('storefront:availableCount', { value0: stock })
              : t('storefront:currentlySoldOut'),
        )}
      </Badge>
      <div className="mt-6 flex flex-wrap items-center gap-4">
        <label htmlFor="book-quantity" className="text-sm font-semibold">
          {t('storefront:quantity')}
        </label>
        <select
          id="book-quantity"
          value={selected}
          onChange={(event) => setQuantity(Number(event.target.value))}
          disabled={blocked || pending || !remaining}
          className="min-h-11 rounded-md border border-input bg-background px-4 text-base text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
        >
          {remaining ? (
            Array.from({ length: remaining }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {localized(i + 1)}
              </option>
            ))
          ) : (
            <option value={0}>0</option>
          )}
        </select>
        {inBag > 0 && (
          <span className="text-sm text-muted-foreground">
            {t('storefront:valueInYourBag', { value0: inBag })}
          </span>
        )}
      </div>
      {selected > 1 && (
        <p className="mt-3 text-sm text-muted-foreground">
          {t('storefront:subtotalValueExcludesDelivery', {
            value0: money(book.priceCents * selected),
          })}
        </p>
      )}
      <Button
        type="submit"
        disabled={blocked || pending || !remaining}
        className="mt-5 w-full disabled:cursor-not-allowed"
      >
        <ShoppingBag size={17} />
        {localized(
          pending
            ? t('storefront:adding')
            : unavailable
              ? t('storefront:unavailable')
              : !stock
                ? t('storefront:soldOut')
                : !remaining
                  ? t('storefront:maximumInBag')
                  : t('storefront:addToBag'),
        )}
      </Button>
      <p role="status" aria-live="polite" className="mt-3 text-sm text-primary">
        {localized(
          added > 0 && inBag > 0 ? t('storefront:addedValueToYourBag', { value0: added }) : '',
        )}
      </p>
      {inBag > 0 && (
        <Link
          to="/cart"
          className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary hover:underline"
        >
          {t('storefront:viewBag')} <ArrowRight size={16} />
        </Link>
      )}
      <Separator className="mt-6 bg-border" />
      <div className="grid grid-cols-2 gap-6 pt-5 text-xs leading-5 text-muted-foreground">
        <span>
          <strong className="mb-1 block text-foreground">{t('storefront:carefullyChosen')}</strong>
          {t('storefront:aShelfOfEnduringFavorites')}
        </span>
        <span>
          <strong className="mb-1 block text-foreground">{t('storefront:demoCheckout')}</strong>
          {t('storefront:stripeHostedTestPayments')}
        </span>
      </div>
    </form>
  )
}

export function BookPage() {
  useI18n()

  const { id = '' } = useParams()
  const location = useLocation()
  const navigationType = useNavigationType()
  useLayoutEffect(() => {
    if (navigationType === 'PUSH') window.scrollTo({ top: 0, behavior: 'instant' })
  }, [location.key, navigationType])
  const catalogReturn = readCatalogReturn(location.state)
  const { data, loading, error, refetch } = useQuery(BookDocument, { variables: { id } })
  const book = data?.book?.id === id ? data.book : undefined
  const related = useQuery(RelatedBooksDocument, {
    variables: { genre: book?.genre ?? '' },
    skip: !book?.genre || loading || !!error,
  })
  const seen = new Set([id])
  const relatedBooks =
    !book || related.loading || related.error
      ? []
      : (related.data?.books.items ?? [])
          .filter((item) => {
            if (item.genre !== book.genre || seen.has(item.id)) return false
            seen.add(item.id)
            return true
          })
          .slice(0, 4)
  const back = (
    <BackLink
      to={catalogReturn?.url ?? '/books'}
      state={catalogReturn ? { catalogReturn } : undefined}
    >
      {t('storefront:allBooks')}
    </BackLink>
  )

  if (loading)
    return (
      <PageContainer className="py-9 sm:py-14">
        {localized(back)}
        <BookLoader label={t('storefront:openingThisBook')} />
        <div className="mt-9 grid gap-8 md:grid-cols-2">
          <Skeleton className="mx-auto h-72 w-52 md:h-96 md:w-72" />
          <div className="space-y-6">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-16 w-4/5" />
            <Skeleton className="h-6 w-2/3" />
          </div>
        </div>
      </PageContainer>
    )
  if (error)
    return (
      <PageContainer className="space-y-8 py-14">
        {localized(back)}
        <Alert variant="destructive">
          <AlertDescription>
            {t('storefront:weCouldNotLoadThisBook')}
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                void refetch().catch(() => {})
              }}
              className="h-auto p-0 font-semibold underline hover:bg-transparent"
            >
              {t('storefront:tryAgain')}
            </Button>
          </AlertDescription>
        </Alert>
      </PageContainer>
    )
  if (!book)
    return (
      <PageContainer className="py-14">
        {localized(back)}
        <h1 className="mt-8 font-serif text-4xl">{t('storefront:bookNotFound')}</h1>
        <Link to="/books" className="mt-5 inline-block text-primary underline">
          {t('storefront:backToTheCollection')}
        </Link>
      </PageContainer>
    )

  return (
    <>
      <PageContainer className="py-9 sm:py-14">
        {localized(back)}
        <div className="mt-8 grid items-start gap-8 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:gap-12 lg:gap-20">
          <Card className="grid place-items-center border-0 bg-cover-panel p-6 md:p-8">
            <div className="w-full max-w-[190px] md:max-w-[280px]">
              <BookCover
                cover={book.cover}
                id={book.id}
                title={localized(book.title)}
                author={book.author}
                large
              />
            </div>
          </Card>
          <PurchaseSummary key={`${book.id}:${location.key}`} book={book} />
        </div>
        <section aria-labelledby="about-book" className="mt-12 border-t border-border pt-8">
          <h2 id="about-book" className="font-serif text-2xl sm:text-3xl">
            {t('storefront:aboutThisBook')}
          </h2>
          <p className="mt-5 max-w-3xl whitespace-pre-line break-words text-base leading-8 text-muted-foreground">
            {localized(
              book.description.trim()
                ? book.description
                : t('storefront:aDescriptionIsNotAvailableForThisBookYet'),
            )}
          </p>
        </section>
      </PageContainer>
      {relatedBooks.length > 0 && (
        <section aria-labelledby="related-books" className="pb-14">
          <BookRail
            label={t('storefront:booksInThisGenre')}
            headerClassName="mt-4 mb-8 border-t border-border pt-8"
            title={
              <h2 id="related-books" className="font-serif text-2xl sm:text-3xl">
                {t('storefront:moreInThisGenre')}
              </h2>
            }
          >
            {relatedBooks.map((item) => (
              <BookCard
                key={item.id}
                book={item}
                catalogContext={catalogReturn ? { catalogReturn } : undefined}
              />
            ))}
          </BookRail>
        </section>
      )}
    </>
  )
}
