import { localized, t, useI18n } from '../../../lib/i18n'
import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { HomepageBook } from '../homepage'
import { BookCover } from './BookCover'
import { Button } from '../../../app/components/ui/button'

export function BookRecommendation({ book, note }: { book: HomepageBook; note: string }) {
  useI18n()

  return (
    <section className="page-shell mt-16 sm:mt-24" aria-labelledby="home-recommendation">
      <div className="grid items-center gap-10 rounded-sm bg-muted p-7 sm:p-12 md:grid-cols-[1fr_1.3fr] lg:gap-20">
        <Link
          to={`/books/${book.id}`}
          aria-label={t('storefront:discoverValue', { value0: book.title })}
          className="mx-auto block w-full max-w-[235px] -rotate-3 transition-transform hover:rotate-0 motion-reduce:transition-none"
        >
          <BookCover
            cover={book.cover}
            decorative
            id={book.id}
            title={localized(book.title)}
            author={book.author}
          />
        </Link>
        <div>
          <p className="eyebrow mb-4">{t('storefront:aBooksellerSRecommendation')}</p>
          <h2 id="home-recommendation" className="font-serif text-3xl leading-tight sm:text-4xl">
            {t('storefront:aBookToSpendALittleTimeWith')}
          </h2>
          <h3 className="mt-6 font-serif text-2xl">
            <bdi dir="auto">{localized(book.title)}</bdi>
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('storefront:byValue', { value0: book.author })}
          </p>
          <p className="mt-5 max-w-lg text-base leading-8 text-muted-foreground">
            {localized(note)}
          </p>
          <Button
            asChild
            variant="secondary"
            className="mt-7 min-h-11 rounded-md px-5 py-3 text-sm font-semibold"
          >
            <Link to={`/books/${book.id}`}>
              {t('storefront:discoverThisBook')} <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
