import { localized, message as msg, t, useI18n } from '../../../lib/i18n'
import { ArrowRight, Compass, Sparkles, BookOpen } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { HomepageBook } from '../homepage'
import { BookCover } from './BookCover'

const moods = [
  {
    genre: 'Adventure',
    get title() {
      return t('storefront:aLittleAdventure')
    },
    copy: msg('storefront:forThePartOfYouThatWantsToGoSomewhereNew'),
    Icon: Compass,
  },
  {
    genre: 'Fantasy',
    get title() {
      return t('storefront:aLittleImagination')
    },
    copy: msg('storefront:leaveTheOrdinaryBehindOnePageAtATime'),
    Icon: Sparkles,
  },
  {
    genre: 'Classic Fiction',
    get title() {
      return t('storefront:somethingEnduring')
    },
    copy: msg('storefront:meetTheStoriesThatKeepFindingNewReaders'),
    Icon: BookOpen,
  },
]

export function ReadingMoods({ genres }: { genres: string[] }) {
  useI18n()

  const available = moods.filter((mood) => genres.includes(mood.genre))
  if (!available.length) return null
  return (
    <section className="page-shell mt-16 sm:mt-20" aria-labelledby="home-moods">
      <p className="eyebrow mb-3">{t('storefront:followYourCuriosity')}</p>
      <h2 id="home-moods" className="font-serif text-3xl tracking-tight sm:text-4xl">
        {t('storefront:findYourReadingMood')}
      </h2>
      <div className="mt-7 grid gap-4 md:grid-cols-3">
        {available.map(({ genre, title, copy, Icon }) => (
          <Link
            key={genre}
            to={`/books?${new URLSearchParams({ genre })}`}
            className="group flex min-h-56 flex-col rounded-xl bg-surface p-7 transition-colors hover:bg-muted motion-reduce:transition-none"
          >
            <Icon className="mb-6 size-8 text-primary" strokeWidth={1.3} aria-hidden="true" />
            <h3 className="font-serif text-2xl">
              <bdi dir="auto">{localized(title)}</bdi>
            </h3>
            <p className="mb-5 mt-3 max-w-xs text-sm leading-6 text-muted-foreground">
              {localized(copy)}
            </p>
            <span className="mt-auto inline-flex items-center gap-2 text-sm font-semibold text-primary">
              {t('storefront:explore')} {localized(genre.toLowerCase())}{' '}
              <ArrowRight size={16} aria-hidden="true" />
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}

export function AuthorDiscovery({ book }: { book?: HomepageBook }) {
  useI18n()

  if (!book) return null
  return (
    <section className="page-shell mt-16 sm:mt-20" aria-labelledby="home-author">
      <div className="grid items-center gap-8 border-y border-border py-10 md:grid-cols-[1fr_1fr_auto] md:gap-12">
        <div>
          <p className="eyebrow mb-3">{t('storefront:behindThePages')}</p>
          <h2 id="home-author" className="font-serif text-3xl sm:text-4xl">
            {t('storefront:exploreAnAuthor')}
          </h2>
          <p className="mt-4 max-w-sm text-sm leading-6 text-muted-foreground">
            {t('storefront:sometimesYourNextReadStartsWithAVoiceYouDLike')}
          </p>
        </div>
        <div className="min-w-0">
          <h3 className="break-words font-serif text-2xl sm:text-3xl">
            <bdi dir="auto">{localized(book.author)}</bdi>
          </h3>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {t('storefront:startWith')}{' '}
            <span className="italic">
              <bdi dir="auto">{localized(book.title)}</bdi>
            </span>
            {t('storefront:orExploreThisAuthorSBooksInOurCollection')}
          </p>
          <Link
            to={`/books?${new URLSearchParams({ search: book.author.trim() })}`}
            className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary hover:underline"
          >
            {t('storefront:exploreBooksBy')} <bdi dir="auto">{localized(book.author)}</bdi>
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
        <Link
          to={`/books/${book.id}`}
          aria-label={t('storefront:startWithValue', { value0: book.title })}
          className="hidden w-28 rotate-3 md:block"
        >
          <BookCover
            cover={book.cover}
            decorative
            id={book.id}
            title={localized(book.title)}
            author={book.author}
          />
        </Link>
      </div>
    </section>
  )
}
