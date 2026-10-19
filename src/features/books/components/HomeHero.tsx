import { ArrowRight, ArrowDown } from 'lucide-react'
import { PageContainer } from '../../../app/components/PageContainer'
import { BookCover } from './BookCover'
import { Button } from '../../../app/components/ui/button'
import { Link } from 'react-router-dom'
import type { HomepageBook } from '../homepage'

export function HomeHero({
  books,
  hasGenres = false,
}: {
  books: HomepageBook[]
  hasGenres?: boolean
}) {
  const book = books[0]
  return (
    <section className="overflow-hidden border-b border-border bg-surface">
      <PageContainer className="grid items-center gap-8 py-10 sm:py-12 md:grid-cols-[1.2fr_1fr] md:gap-14 lg:py-14">
        <div className="max-w-xl">
          <p className="eyebrow mb-5">The Quiet Shelf · A place for stories</p>
          <h1 className="font-serif text-[clamp(2.7rem,4.8vw,4.8rem)] leading-[1.05] tracking-[-.05em]">
            A good book.
            <br />A little <em className="font-normal text-copper">possibility.</em>
          </h1>
          <p className="mt-5 max-w-md text-base leading-7 text-muted-foreground">
            Step away from the everyday. Find a familiar favorite, a different perspective, or a
            story you didn’t know you needed.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3">
            <Button asChild className="rounded-sm">
              <Link to="/books">
                Browse all books <ArrowRight size={17} aria-hidden="true" />
              </Link>
            </Button>
            {hasGenres && (
              <a
                href="#home-genres"
                className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary hover:underline"
              >
                Browse genres <ArrowDown size={15} aria-hidden="true" />
              </a>
            )}
          </div>
        </div>
        {book ? (
          <div className="relative grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-center gap-5 rounded-t-[100px] border border-border bg-background px-6 pb-7 pt-10 sm:gap-7 sm:px-8">
            <Link
              to={`/books/${book.id}`}
              aria-label={`Featured book: ${book.title}`}
              className="block w-full max-w-[190px] -rotate-6 transition-transform hover:rotate-0 motion-reduce:transition-none"
            >
              <BookCover cover={book.cover} decorative eager id={book.id} title={book.title} author={book.author} />
            </Link>
            <div className="min-w-0">
              <p className="eyebrow mb-3">On our reading table</p>
              <p className="break-words font-serif text-xl leading-tight sm:text-2xl">
                {book.title}
              </p>
              <p className="mt-3 break-words text-sm text-muted-foreground">{book.author}</p>
              <Link
                to={`/books/${book.id}`}
                className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary hover:underline"
              >
                Take a look <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="hidden rounded-t-full border border-border px-12 py-20 text-center md:block">
            <p className="font-serif text-3xl italic text-muted-foreground">
              There’s a whole world
              <br />
              between the covers.
            </p>
          </div>
        )}
      </PageContainer>
    </section>
  )
}
