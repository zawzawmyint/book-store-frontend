import { ArrowRight, Compass, Sparkles, BookOpen } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { HomepageBook } from '../homepage'
import { BookCover } from './BookCover'

const moods = [
  {
    genre: 'Adventure',
    title: 'A little adventure',
    copy: 'For the part of you that wants to go somewhere new.',
    Icon: Compass,
  },
  {
    genre: 'Fantasy',
    title: 'A little imagination',
    copy: 'Leave the ordinary behind, one page at a time.',
    Icon: Sparkles,
  },
  {
    genre: 'Classic Fiction',
    title: 'Something enduring',
    copy: 'Meet the stories that keep finding new readers.',
    Icon: BookOpen,
  },
]

export function ReadingMoods({ genres }: { genres: string[] }) {
  const available = moods.filter((mood) => genres.includes(mood.genre))
  if (!available.length) return null
  return (
    <section className="page-shell mt-16 sm:mt-20" aria-labelledby="home-moods">
      <p className="eyebrow mb-3">Follow your curiosity</p>
      <h2 id="home-moods" className="font-serif text-3xl tracking-tight sm:text-4xl">
        Find your reading mood
      </h2>
      <div className="mt-7 grid gap-4 md:grid-cols-3">
        {available.map(({ genre, title, copy, Icon }) => (
          <Link
            key={genre}
            to={`/books?${new URLSearchParams({ genre })}`}
            className="group flex min-h-56 flex-col rounded-sm border border-border bg-surface p-7 transition-colors hover:bg-muted motion-reduce:transition-none"
          >
            <Icon className="mb-6 size-8 text-primary" strokeWidth={1.3} aria-hidden="true" />
            <h3 className="font-serif text-2xl">{title}</h3>
            <p className="mb-5 mt-3 max-w-xs text-sm leading-6 text-muted-foreground">{copy}</p>
            <span className="mt-auto inline-flex items-center gap-2 text-sm font-semibold text-primary">
              Explore {genre.toLowerCase()} <ArrowRight size={16} aria-hidden="true" />
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}

export function AuthorDiscovery({ book }: { book?: HomepageBook }) {
  if (!book) return null
  return (
    <section className="page-shell mt-16 sm:mt-20" aria-labelledby="home-author">
      <div className="grid items-center gap-8 border-y border-border py-10 md:grid-cols-[1fr_1fr_auto] md:gap-12">
        <div>
          <p className="eyebrow mb-3">Behind the pages</p>
          <h2 id="home-author" className="font-serif text-3xl sm:text-4xl">
            Explore an author
          </h2>
          <p className="mt-4 max-w-sm text-sm leading-6 text-muted-foreground">
            Sometimes your next read starts with a voice you’d like to hear more from.
          </p>
        </div>
        <div className="min-w-0">
          <h3 className="break-words font-serif text-2xl sm:text-3xl">{book.author}</h3>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Start with <span className="italic">{book.title}</span>, or explore this author’s books
            in our collection.
          </p>
          <Link
            to={`/books?${new URLSearchParams({ search: book.author.trim() })}`}
            className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary hover:underline"
          >
            Explore books by {book.author}
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
        <Link
          to={`/books/${book.id}`}
          aria-label={`Start with ${book.title}`}
          className="hidden w-28 rotate-3 md:block"
        >
          <BookCover cover={book.cover} decorative id={book.id} title={book.title} author={book.author} />
        </Link>
      </div>
    </section>
  )
}
