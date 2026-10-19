import { localized, t, useI18n } from '../../../lib/i18n'
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
  useI18n()

  const book = books[0]
  return (
    <section className="home-hero overflow-hidden">
      <PageContainer className="grid items-center gap-8 py-10 sm:py-12 md:grid-cols-[1.2fr_1fr] md:gap-14 lg:py-14">
        <div className="max-w-xl">
          <p className="eyebrow mb-5">{t('storefront:theQuietShelfAPlaceForStories')}</p>
          <h1 className="font-serif text-[clamp(2.7rem,4.8vw,4.8rem)] leading-[1.05] tracking-[-.05em]">
            {t('storefront:aGoodBook')}
            <br />
            {t('storefront:aLittle')}{' '}
            <em className="font-normal text-copper">{t('storefront:possibility')}</em>
          </h1>
          <p className="mt-5 max-w-md text-base leading-7 text-muted-foreground">
            {t('storefront:stepAwayFromTheEverydayFindAFamiliarFavoriteADifferent')}
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3">
            <Button asChild className="rounded-sm">
              <Link to="/books">
                {t('storefront:browseAllBooks')} <ArrowRight size={17} aria-hidden="true" />
              </Link>
            </Button>
            {hasGenres && (
              <a
                href="#home-genres"
                className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary hover:underline"
              >
                {t('storefront:browseGenres')} <ArrowDown size={15} aria-hidden="true" />
              </a>
            )}
          </div>
        </div>
        {book ? (
          <div className="relative grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-center gap-5 px-6 pb-7 pt-10 sm:gap-7 sm:px-8">
            <Link
              to={`/books/${book.id}`}
              aria-label={t('storefront:featuredBookValue', { value0: book.title })}
              className="block w-full max-w-[190px] -rotate-6 transition-transform hover:rotate-0 motion-reduce:transition-none"
            >
              <BookCover
                cover={book.cover}
                decorative
                eager
                id={book.id}
                title={localized(book.title)}
                author={book.author}
              />
            </Link>
            <div className="min-w-0">
              <p className="eyebrow mb-3">{t('storefront:onOurReadingTable')}</p>
              <p className="break-words font-serif text-xl leading-tight sm:text-2xl">
                <bdi dir="auto">{localized(book.title)}</bdi>
              </p>
              <p className="mt-3 break-words text-sm text-muted-foreground">
                <bdi dir="auto">{localized(book.author)}</bdi>
              </p>
              <Link
                to={`/books/${book.id}`}
                className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary hover:underline"
              >
                {t('storefront:takeALook')} <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="hidden px-12 py-20 text-center md:block">
            <p className="font-serif text-3xl italic text-muted-foreground">
              {t('storefront:thereSAWholeWorld')}
              <br />
              {t('storefront:betweenTheCovers')}
            </p>
          </div>
        )}
      </PageContainer>
    </section>
  )
}
