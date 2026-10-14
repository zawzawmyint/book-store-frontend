import { useQuery } from '@apollo/client/react'
import { Navigate, Link, useLocation } from 'react-router-dom'
import { ArrowRight, BookOpen, Compass, Sparkles, Feather, Moon, Rocket } from 'lucide-react'
import { StorefrontHomeDocument } from '../../../generated/graphql'
import { homepageSelections, homepageVariables, type HomepageBook } from '../homepage'
import { HomeHero } from '../components/HomeHero'
import { StoreNote } from '../components/StoreNote'
import { BookCard } from '../components/BookCard'
import { BookRecommendation } from '../components/BookRecommendation'
import { ReadingMoods, AuthorDiscovery } from '../components/ReadingDiscovery'
import { Button } from '../../../app/components/ui/button'
import { Alert, AlertDescription } from '../../../app/components/ui/alert'
import { Skeleton } from '../../../app/components/ui/skeleton'

export function HomePage() {
  const { search, hash } = useLocation()
  const params = new URLSearchParams(search)
  if (params.has('search') || params.has('page') || hash === '#collection')
    return (
      <Navigate
        replace
        to={{ pathname: '/books', search, hash: hash === '#collection' ? '' : hash }}
      />
    )
  return <HomeContent />
}

function HomeContent() {
  const { data, loading, error, refetch } = useQuery(StorefrontHomeDocument, {
    variables: homepageVariables,
    notifyOnNetworkStatusChange: true,
  })
  const candidates = !error && data ? [data.first, data.second, data.third, data.fourth] : []
  const books = candidates.filter(
    (book, index): book is HomepageBook =>
      !!book && candidates.findIndex((candidate) => candidate?.id === book.id) === index,
  )
  const genres = !error ? [...new Set(data?.genres.filter((genre) => genre.trim()) ?? [])] : []
  const recommendation = books.find((book) =>
    homepageSelections.some((entry) => entry.bookId === book.id && entry.editorialNote),
  )
  const note = homepageSelections.find(
    (entry) => entry.bookId === recommendation?.id,
  )?.editorialNote
  return (
    <>
      <HomeHero books={books} hasGenres={genres.length > 0} />
      {!error && genres.length > 0 && (
        <section className="page-shell pt-12 sm:pt-16" aria-labelledby="home-genres">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 id="home-genres" className="scroll-mt-6 font-serif text-2xl sm:text-3xl">
              Where will your next chapter take you?
            </h2>
            <span className="text-sm text-muted-foreground">Browse by genre</span>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {genres.map((genre) => {
              const Icon =
                (
                  {
                    Adventure: Compass,
                    Fantasy: Sparkles,
                    'Classic Fiction': Feather,
                    'Gothic Fiction': Moon,
                    'Science Fiction': Rocket,
                  } as Record<string, typeof BookOpen>
                )[genre] ?? BookOpen
              return (
                <Link
                  key={genre}
                  to={`/books?${new URLSearchParams({ genre })}`}
                  className="group flex min-h-36 flex-col items-center justify-center gap-4 rounded-sm border border-border bg-surface px-3 py-5 text-center text-sm font-semibold transition-colors hover:bg-muted motion-reduce:transition-none"
                >
                  <Icon size={32} strokeWidth={1.2} className="text-primary" aria-hidden="true" />
                  <span>{genre}</span>
                  <ArrowRight size={14} className="text-muted-foreground" aria-hidden="true" />
                </Link>
              )
            })}
          </div>
        </section>
      )}
      <section className="page-shell pt-16 sm:pt-20" aria-labelledby="home-selections">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-5 border-t border-border pt-10">
          <div>
            <p className="eyebrow mb-3">The Quiet Shelf edit</p>
            <h2 id="home-selections" className="font-serif text-3xl tracking-[-.04em] sm:text-4xl">
              Selected for your shelf
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">
              A few favorites to begin your next reading adventure.
            </p>
          </div>
          <Link
            to="/books"
            className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary hover:underline"
          >
            View all books <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
        {loading && !data ? (
          <>
            <p className="sr-only" role="status">
              Opening selected books…
            </p>
            <div className="grid grid-cols-2 gap-5 lg:grid-cols-4" aria-hidden="true">
              {[0, 1, 2, 3].map((id) => (
                <Skeleton key={id} className="h-72 sm:h-96" />
              ))}
            </div>
          </>
        ) : error ? (
          <Alert variant="destructive">
            <AlertDescription>
              We could not load our selected books.{' '}
              <Button
                variant="ghost"
                className="h-auto p-0 underline"
                onClick={() => void refetch()}
              >
                Try again
              </Button>
            </AlertDescription>
          </Alert>
        ) : books.length ? (
          <div className="grid gap-x-7 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {books.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        ) : (
          <div className="rounded-sm bg-muted p-8 text-center">
            <p className="font-serif text-2xl">No selections on this shelf just yet.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Explore the full collection to find your next read.
            </p>
            <Link
              to="/books"
              className="mt-4 inline-block text-sm font-semibold text-primary underline"
            >
              Explore all books
            </Link>
          </div>
        )}
      </section>
      <ReadingMoods genres={genres} />
      {recommendation && note && <BookRecommendation book={recommendation} note={note} />}
      <AuthorDiscovery book={books.find((book) => book.author.trim())} />
      <StoreNote />
    </>
  )
}
