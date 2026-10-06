import { ArrowUpRight, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { BookQuery } from '../../../generated/graphql'
import { useCartStore } from '../../cart/cart-store'
import { BookCover } from './BookCover'
import { money } from '../../../lib/format'
import { Button } from '../../../app/components/ui/button'
import { Card, CardContent } from '../../../app/components/ui/card'
import { Badge } from '../../../app/components/ui/badge'
import { Separator } from '../../../app/components/ui/separator'

export function BookCard({ book }: { book: NonNullable<BookQuery['book']> }) {
  const add = useCartStore((state) => state.add)
  return (
    <article className="group min-w-0">
      <Card className="border-0 bg-transparent">
        <Link
          to={`/books/${book.id}`}
          className="block rounded-sm bg-cover-panel p-5 transition-colors hover:bg-secondary sm:p-7"
          aria-label={`View ${book.title}`}
        >
          <div className="mx-auto max-w-[215px] transition-transform duration-300 group-hover:-translate-y-1 group-hover:rotate-[-1deg]">
            <BookCover id={book.id} title={book.title} author={book.author} />
          </div>
        </Link>
        <CardContent className="px-0 pb-0 pt-4">
          <div className="mb-2 flex items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-[.2em] text-copper">
            <Badge
              variant="outline"
              className="border-0 px-0 py-0 text-[10px] uppercase tracking-[.2em] text-copper"
            >
              {book.genre}
            </Badge>
            <ArrowUpRight size={15} className="text-copper" />
          </div>
          <Link
            to={`/books/${book.id}`}
            className="font-serif text-[22px] leading-tight text-foreground hover:underline"
          >
            {book.title}
          </Link>
          <p className="mt-1 text-sm text-muted-foreground">{book.author}</p>
          <Separator className="mt-4 bg-border" />
          <div className="flex items-center justify-between gap-2 pt-3">
            <strong className="text-sm font-semibold text-foreground">
              {money(book.priceCents)}
            </strong>
            <Button
              type="button"
              onClick={() => add(book)}
              disabled={book.stock < 1}
              variant="ghost"
              className="h-auto gap-1 p-0 text-xs font-bold uppercase tracking-[.13em] text-primary hover:bg-transparent hover:text-primary disabled:cursor-not-allowed disabled:text-muted-foreground"
            >
              <Plus size={15} /> {book.stock ? 'Add to bag' : 'Sold out'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </article>
  )
}
