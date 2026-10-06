import { Minus, Plus, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { BookCover } from '../../books/components/BookCover'
import { money } from '../../../lib/format'
import type { CartItem } from '../cart'
import { Button } from '../../../app/components/ui/button'

export function CartLine({
  item,
  update,
}: {
  item: CartItem
  update: (id: string, quantity: number) => void
}) {
  return (
    <div className="flex gap-5 py-7 first:pt-0 sm:gap-8">
      <Link to={`/books/${item.id}`} className="w-24 shrink-0 bg-cover-panel p-2 sm:w-32 sm:p-3">
        <BookCover id={item.id} title={item.title} author={item.author} />
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
        <p className="mt-3 text-sm font-semibold">{money(item.priceCents)}</p>
        <div className="mt-auto flex items-end justify-between pt-5">
          <div className="inline-flex items-center border border-control">
            <Button
              type="button"
              variant="ghost"
              aria-label={`Remove one ${item.title}`}
              onClick={() => update(item.id, item.quantity - 1)}
              className="p-2 hover:bg-muted"
            >
              <Minus size={14} />
            </Button>
            <span className="min-w-8 text-center text-sm">{item.quantity}</span>
            <Button
              type="button"
              variant="ghost"
              aria-label={`Add one ${item.title}`}
              disabled={item.quantity >= item.stock}
              onClick={() => update(item.id, item.quantity + 1)}
              className="p-2 hover:bg-muted disabled:opacity-30"
            >
              <Plus size={14} />
            </Button>
          </div>
          <Button
            type="button"
            variant="ghost"
            aria-label={`Remove ${item.title} from bag`}
            onClick={() => update(item.id, 0)}
            className="p-2 text-muted-foreground hover:text-destructive"
          >
            <Trash2 size={17} />
          </Button>
        </div>
      </div>
    </div>
  )
}
