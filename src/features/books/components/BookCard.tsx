import { ArrowUpRight, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Book } from '../../../lib/graphql'
import { useCartStore } from '../../cart/cart-store'
import { BookCover } from './BookCover'
import { money } from '../../../lib/format'
import { Button } from '../../../app/components/ui/button'
import { Card, CardContent } from '../../../app/components/ui/card'
import { Badge } from '../../../app/components/ui/badge'
import { Separator } from '../../../app/components/ui/separator'

export function BookCard({ book }: { book: Book }) {
  const add = useCartStore((state) => state.add)
  return (
    <article className="group min-w-0">
      <Card className="border-0 bg-transparent">
        <Link
          to={`/books/${book.id}`}
          className="block rounded-sm bg-[#e9e5dd] p-5 transition-colors hover:bg-[#ded8cd] sm:p-7"
          aria-label={`View ${book.title}`}
        >
          <div className="mx-auto max-w-[215px] transition-transform duration-300 group-hover:-translate-y-1 group-hover:rotate-[-1deg]">
            <BookCover id={book.id} title={book.title} author={book.author} />
          </div>
        </Link>
        <CardContent className="px-0 pb-0 pt-4">
          <div className="mb-2 flex items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-[.2em] text-[#967656]">
            <Badge
              variant="outline"
              className="border-0 px-0 py-0 text-[10px] uppercase tracking-[.2em] text-[#967656]"
            >
              {book.genre}
            </Badge>
            <ArrowUpRight size={15} className="text-[#866c54]" />
          </div>
          <Link
            to={`/books/${book.id}`}
            className="font-serif text-[22px] leading-tight text-[#252d29] hover:underline"
          >
            {book.title}
          </Link>
          <p className="mt-1 text-sm text-[#7b7d78]">{book.author}</p>
          <Separator className="mt-4 bg-[#dedbd4]" />
          <div className="flex items-center justify-between gap-2 pt-3">
            <strong className="text-sm font-semibold text-[#283d34]">
              {money(book.priceCents)}
            </strong>
            <Button
              type="button"
              onClick={() => add(book)}
              disabled={book.stock < 1}
              variant="ghost"
              className="h-auto gap-1 p-0 text-xs font-bold uppercase tracking-[.13em] text-[#2c6a50] hover:bg-transparent hover:text-[#1c4b36] disabled:cursor-not-allowed disabled:text-[#a0a19c]"
            >
              <Plus size={15} /> {book.stock ? 'Add to bag' : 'Sold out'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </article>
  )
}
