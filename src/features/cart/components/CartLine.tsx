import { Minus, Plus, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { BookCover } from '../../books/components/BookCover'
import { money } from '../../../lib/format'
import type { CartItem } from '../cart'
import { Button } from '../../../app/components/ui/button'

export function CartLine({
  item,
  update,
  disabled = false,
  cover,
}: {
  item: CartItem
  update: (id: string, quantity: number) => void
  disabled?: boolean
  cover?: import('../../books/components/BookCover').CoverImage | null
}) {
  return (
    <div className="flex gap-5 py-7 first:pt-0 sm:gap-8">
      <Link to={`/books/${item.id}`} className="w-24 shrink-0 bg-cover-panel p-2 sm:w-32 sm:p-3">
        <BookCover cover={cover} decorative id={item.id} title={item.title} author={item.author} />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="eyebrow text-[10px]">{item.genre}</p>
        <Link
          to={`/books/${item.id}`}
          className="mt-2 font-serif text-xl leading-tight hover:underline sm:text-2xl"
        >
          {item.title}
        </Link>
        <p className="mt-1 text-sm text-muted-foreground">{item.author}</p>
        <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm">
          <span className="text-muted-foreground">{money(item.priceCents)} each</span>
          <strong>
            <span className="sr-only">Line total for {item.title}: </span>
            {money(item.priceCents * item.quantity)}
          </strong>
        </div>
        {item.available === false && (
          <p role="status" className="mt-2 text-sm text-destructive">
            Unavailable for this quantity. Decrease or remove this book.
          </p>
        )}
        <div className="mt-auto flex items-end justify-between pt-5">
          <div className="inline-flex items-center border border-control">
            <Button
              type="button"
              variant="ghost"
              aria-label={`Remove one ${item.title}`}
              disabled={disabled}
              onClick={() => update(item.id, item.quantity - 1)}
              className="h-11 w-11 hover:bg-muted"
            >
              <Minus size={14} />
            </Button>
            <span className="min-w-8 text-center text-sm">{item.quantity}</span>
            <Button
              type="button"
              variant="ghost"
              aria-label={`Add one ${item.title}`}
              disabled={
                disabled || item.available === false || item.quantity >= Math.min(10, item.stock)
              }
              onClick={() => update(item.id, item.quantity + 1)}
              className="h-11 w-11 hover:bg-muted disabled:opacity-30"
            >
              <Plus size={14} />
            </Button>
          </div>
          <Button
            type="button"
            variant="ghost"
            aria-label={`Remove ${item.title} from bag`}
            disabled={disabled}
            onClick={() => update(item.id, 0)}
            className="h-11 w-11 shrink-0 text-muted-foreground hover:text-destructive"
          >
            <Trash2 size={17} />
          </Button>
        </div>
      </div>
    </div>
  )
}
