import { t, useI18n } from '../../lib/i18n'
import { ArrowRight, Search } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@apollo/client/react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { BooksDocument } from '../../generated/graphql'
import { money } from '../../lib/format'
import { BookCover } from '../../features/books/components/BookCover'
import {
  CommandInput,
  CommandList,
  CommandGroup,
  CommandItem,
  COMMAND_NO_SELECTION,
} from './ui/command'
import { Empty, EmptyHeader, EmptyDescription } from './ui/empty'
import { IconAction } from './IconAction'
import { Dialog, DialogTrigger } from './ui/dialog'
import { SearchFinder } from './SearchFinder'

export function StorefrontSearch() {
  useI18n()
  const { pathname, search } = useLocation()
  const [open, setOpen] = useState(false)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <IconAction label={t('common:openStoreSearch')} tooltip={t('common:searchTooltip')}>
          <Search aria-hidden="true" />
        </IconAction>
      </DialogTrigger>
      {open && (
        <StorefrontFinder
          key={pathname + search}
          initialValue={new URLSearchParams(search).get('search') ?? ''}
          close={() => setOpen(false)}
        />
      )}
    </Dialog>
  )
}

function StorefrontFinder({ initialValue, close }: { initialValue: string; close: () => void }) {
  useI18n()
  const navigate = useNavigate()
  const input = useRef<HTMLInputElement>(null)
  const [value, setValue] = useState(initialValue)
  const [debounced, setDebounced] = useState('')
  const [active, setActive] = useState<string>()
  const term = value.trim()
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(term), 250)
    return () => window.clearTimeout(timer)
  }, [term])
  const { data, loading, error, refetch } = useQuery(BooksDocument, {
    variables: { search: debounced, limit: 5, offset: 0 },
    skip: debounced.length < 2,
    fetchPolicy: 'no-cache',
  })
  const eligible = term.length >= 2
  const current = eligible && debounced === term
  const items = current && !loading && !error ? (data?.books.items ?? []) : []
  const selected = items.find((item) => item.id === active)
  const allURL = term ? `/books?${new URLSearchParams({ search: term })}` : '/books'
  function go(to: string) {
    close()
    navigate(to, { state: { fromStoreSearch: true } })
  }
  return (
    <SearchFinder
      title={t('common:findYourNextRead')}
      commandProps={{
        label: t('common:storeSearch'),
        value: selected?.id ?? COMMAND_NO_SELECTION,
        onValueChange: setActive,
        shouldFilter: false,
        loop: true,
        vimBindings: false,
      }}
      onOpenAutoFocus={(event) => {
        event.preventDefault()
        input.current?.focus()
      }}
      input={
        <form
          role="search"
          aria-label={t('common:storeSearch')}
          className="search-finder-form"
          onSubmit={(event) => {
            event.preventDefault()
            go(selected ? `/books/${selected.id}` : allURL)
          }}
        >
          <CommandInput
            ref={input}
            aria-label={t('common:searchTheStore')}
            maxLength={100}
            placeholder={t('common:findATitleAuthorOrGenre')}
            value={value}
            onValueChange={(nextValue) => {
              setValue(nextValue)
              setActive(undefined)
            }}
            onKeyDown={(event) => {
              if (event.nativeEvent.isComposing || event.keyCode === 229) {
                if (event.key === 'Enter') event.preventDefault()
                return
              }
              if (event.key === 'Enter') {
                event.preventDefault()
                go(selected ? `/books/${selected.id}` : allURL)
              }
            }}
          />
        </form>
      }
      footer={
        <Link to={allURL} onClick={close} className="search-finder-all">
          {t('common:searchAllBooks')}
          <ArrowRight aria-hidden="true" className="size-4 rtl:rotate-180" />
        </Link>
      }
    >
      <p
        role="status"
        className={
          items.length || (current && !loading && !error) ? 'sr-only' : 'search-finder-state'
        }
      >
        {!eligible
          ? t('common:searchFinderHint')
          : !current || loading
            ? t('common:loading')
            : error
              ? t('common:requestFailed')
              : !items.length
                ? t('common:searchNoMatches')
                : t('common:bookCount', { count: data?.books.total ?? 0 })}
      </p>
      {current && !loading && !error && items.length === 0 && (
        <Empty className="gap-2 p-4">
          <EmptyHeader>
            <EmptyDescription>{t('common:searchNoMatches')}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
      {current && error && (
        <button
          type="button"
          className="search-finder-all"
          onClick={() => {
            void refetch()
          }}
        >
          {t('common:notificationRetry')}
        </button>
      )}
      <CommandList label={t('common:searchTheStore')}>
        <CommandGroup value="books">
          {items.map((book) => (
            <CommandItem key={book.id} value={book.id} asChild>
              <Link
                to={`/books/${book.id}`}
                tabIndex={-1}
                onMouseDown={(event) => event.preventDefault()}
                onClick={close}
                className="search-finder-book"
              >
                <BookCover {...book} compact decorative />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium break-words">
                    <bdi dir="auto">{book.title}</bdi>
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    <bdi dir="auto">{book.author}</bdi>
                  </span>
                </span>
                <span className="shrink-0 text-sm">{money(book.priceCents)}</span>
              </Link>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </SearchFinder>
  )
}
