import { localized, t, useI18n } from '../../../lib/i18n'
import { ArrowUpRight, Plus } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import type { MouseEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import { catalogLinkState, readCatalogReturn } from '../catalog-navigation'
import type { BookQuery } from '../../../generated/graphql'
import { cartBlocked, useCartStore } from '../../cart/cart-store'
import { BookCover } from './BookCover'
import { money } from '../../../lib/format'
import { Button } from '../../../app/components/ui/button'
import { Card, CardContent } from '../../../app/components/ui/card'
import { Badge } from '../../../app/components/ui/badge'
import { Separator } from '../../../app/components/ui/separator'

export function BookCard({
  book,
  catalogContext,
}: {
  book: NonNullable<BookQuery['book']>
  catalogContext?: unknown
}) {
  useI18n()

  const add = useCartStore((state) => state.add)
  const blocked = useCartStore(cartBlocked)
  const quantity = useCartStore(
    (state) => state.items.find((item) => item.id === book.id)?.quantity ?? 0,
  )
  const [added, setAdded] = useState(false)
  const attempt = useRef<{ owner: string | null | undefined; quantity: number } | null>(null)
  useEffect(
    () =>
      useCartStore.subscribe((state, previous) => {
        const count = state.items.find((item) => item.id === book.id)?.quantity ?? 0
        if (state.owner !== previous.owner || !count) setAdded(false)
        const pending = attempt.current
        if (!pending) return
        if (
          state.owner !== pending.owner ||
          ['error', 'conflict', 'loading'].includes(state.status) ||
          state.validationMessage
        ) {
          attempt.current = null
          setAdded(false)
          return
        }
        if (!cartBlocked(state) && count > pending.quantity) {
          attempt.current = null
          setAdded(true)
        }
      }),
    [book.id],
  )
  function addBook() {
    setAdded(false)
    const state = useCartStore.getState()
    attempt.current = { owner: state.owner, quantity }
    add(book)
  }
  const limitReached = book.stock > 0 && quantity >= Math.min(10, book.stock)
  const navigate = useNavigate()
  function openBook(event: MouseEvent<HTMLAnchorElement>) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
      return
    const carried = readCatalogReturn(catalogContext)
    const state = carried ? { catalogReturn: carried } : catalogLinkState()
    if (!state) return
    event.preventDefault()
    navigate(`/books/${book.id}`, { state })
  }
  return (
    <article className="group min-w-0">
      <Card className="flex h-full flex-col border-0 bg-transparent">
        <Link
          to={`/books/${book.id}`}
          onClick={openBook}
          className="block rounded-sm bg-cover-panel p-5 transition-colors hover:bg-secondary sm:p-7"
          aria-label={t('storefront:viewValue', { value0: book.title })}
        >
          <div className="mx-auto max-w-[215px] transition-transform duration-300 group-hover:-translate-y-1 group-hover:rotate-[-1deg] motion-reduce:transform-none motion-reduce:transition-none">
            <BookCover
              cover={book.cover}
              decorative
              id={book.id}
              title={localized(book.title)}
              author={book.author}
            />
          </div>
        </Link>
        <CardContent className="flex flex-1 flex-col px-0 pb-0 pt-4">
          <div className="mb-2 flex items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-[.2em] text-copper">
            <Badge
              variant="outline"
              className="border-0 px-0 py-0 text-[10px] uppercase tracking-[.2em] text-copper"
            >
              <bdi dir="auto">{localized(book.genre)}</bdi>
            </Badge>
            <ArrowUpRight size={15} className="text-copper" />
          </div>
          <Link
            to={`/books/${book.id}`}
            onClick={openBook}
            title={localized(book.title)}
            className="line-clamp-2 min-h-[2.5em] break-words font-serif text-[22px] leading-tight text-foreground hover:underline"
          >
            <bdi dir="auto">{localized(book.title)}</bdi>
          </Link>
          <p className="mt-1 break-words text-sm text-muted-foreground">
            <bdi dir="auto">{localized(book.author)}</bdi>
          </p>
          <p className="mb-4 mt-2 text-xs text-muted-foreground">
            {localized(book.stock ? t('storefront:inStock') : t('storefront:soldOut'))}
          </p>
          <Separator className="mt-auto bg-border" />
          <div className="flex flex-wrap items-center justify-between gap-x-2 pt-1">
            <strong className="text-sm font-semibold text-foreground">
              {localized(money(book.priceCents))}
            </strong>
            <Button
              type="button"
              onClick={addBook}
              disabled={blocked || book.stock < 1 || quantity >= Math.min(10, book.stock)}
              variant="ghost"
              className="min-h-11 gap-1 px-0 text-xs font-bold text-primary hover:bg-transparent hover:text-primary disabled:cursor-not-allowed disabled:text-muted-foreground"
            >
              <Plus size={15} />{' '}
              {localized(
                book.stock
                  ? limitReached
                    ? t('storefront:maximumInBag')
                    : t('storefront:addToBag')
                  : t('storefront:soldOut'),
              )}
            </Button>
          </div>
          <div className="min-h-6 text-xs text-primary" role="status" aria-live="polite">
            {added && (
              <>
                {t('storefront:added')}
                <Link
                  to="/cart"
                  className="inline-flex min-h-11 items-center font-semibold underline"
                >
                  {t('storefront:viewBag')}
                </Link>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </article>
  )
}
