import { useQuery } from '@apollo/client/react'
import { ArrowRight, Check, ShoppingBag } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { BookCover } from '../components/BookCover'
import { useCartStore } from '../../cart/cart-store'
import { BookDocument } from '../../../generated/graphql'
import { money } from '../../../lib/format'
import { BackLink } from '../../../app/components/BackLink'
import { PageContainer } from '../../../app/components/PageContainer'
import { Button } from '../../../app/components/ui/button'
import { Alert, AlertDescription } from '../../../app/components/ui/alert'
import { Badge } from '../../../app/components/ui/badge'
import { Card } from '../../../app/components/ui/card'
import { Separator } from '../../../app/components/ui/separator'
import { Skeleton } from '../../../app/components/ui/skeleton'

export function BookPage() {
  const { id = '' } = useParams()
  const { data, loading, error, refetch } = useQuery(BookDocument, {
    variables: { id },
  })
  const add = useCartStore((state) => state.add)
  const book = data?.book
  const inBag = useCartStore((state) => state.items.find((item) => item.id === id)?.quantity || 0)

  if (loading)
    return (
      <PageContainer className="grid gap-12 py-14 md:grid-cols-2">
        <span className="sr-only" role="status">
          Opening this book…
        </span>
        <Skeleton className="min-h-[450px] rounded-none" />
        <div className="space-y-6 py-12">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-16 w-4/5" />
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-32 w-full" />
        </div>
      </PageContainer>
    )
  if (error)
    return (
      <PageContainer className="py-24">
        <Alert variant="destructive">
          <AlertDescription>
            We could not load this book.{' '}
            <Button
              type="button"
              variant="ghost"
              onClick={() => refetch()}
              className="h-auto p-0 font-semibold underline hover:bg-transparent"
            >
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      </PageContainer>
    )
  if (!book)
    return (
      <PageContainer className="py-24">
        <h1 className="font-serif text-4xl">Book not found</h1>
        <Link to="/" className="mt-5 inline-block text-primary underline">
          Back to the collection
        </Link>
      </PageContainer>
    )

  return (
    <PageContainer className="py-9 sm:py-14">
      <BackLink to="/">All books</BackLink>
      <div className="mt-9 grid gap-12 md:grid-cols-2 md:gap-16 lg:gap-24">
        <Card className="grid min-h-[450px] place-items-center border-0 bg-cover-panel p-12 sm:min-h-[600px]">
          <BookCover id={book.id} title={book.title} author={book.author} large />
        </Card>
        <div className="flex flex-col justify-center pb-8">
          <p className="text-xs font-bold uppercase tracking-[.22em] text-copper">{book.genre}</p>
          <h1 className="mt-5 font-serif text-[clamp(3rem,5vw,5rem)] leading-[1.03] tracking-[-.05em]">
            {book.title}
          </h1>
          <p className="mt-5 font-serif text-xl italic text-muted-foreground">by {book.author}</p>
          <Separator className="my-9 bg-border" />
          <p className="text-base leading-8 text-muted-foreground">{book.description}</p>
          <p className="mt-9 text-2xl font-semibold">{money(book.priceCents)}</p>
          <Badge
            variant="outline"
            className={`mt-2 flex w-fit items-center gap-2 border-0 px-0 py-0 text-sm font-normal ${book.stock ? 'text-primary' : 'text-destructive'}`}
          >
            <Check size={15} /> {book.stock ? `${book.stock} available` : 'Currently sold out'}
          </Badge>
          <Button
            type="button"
            onClick={() => add(book)}
            disabled={!book.stock || inBag >= book.stock}
            className="mt-8 w-full disabled:cursor-not-allowed"
          >
            <ShoppingBag size={17} />{' '}
            {inBag >= book.stock && book.stock ? 'Maximum in bag' : 'Add to bag'}
          </Button>
          {inBag > 0 && (
            <Link
              to="/cart"
              className="mt-4 inline-flex items-center justify-center gap-2 text-sm font-semibold text-primary hover:underline"
            >
              {inBag} in your bag · View bag <ArrowRight size={16} />
            </Link>
          )}
          <Separator className="mt-12 bg-border" />
          <div className="grid grid-cols-2 gap-6 pt-6 text-xs leading-5 text-muted-foreground">
            <span>
              <strong className="mb-1 block text-foreground">Carefully chosen</strong> A shelf of
              enduring favorites.
            </span>
            <span>
              <strong className="mb-1 block text-foreground">Demo checkout</strong> No payment is
              collected.
            </span>
          </div>
        </div>
      </div>
    </PageContainer>
  )
}
