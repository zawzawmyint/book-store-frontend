import { useId, useState, type FormEvent } from 'react'
import { Button } from '../../../app/components/ui/button'
import { Input } from '../../../app/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from '../../../app/components/ui/sheet'
import {
  catalogSorts,
  catalogUrl,
  parsePriceRange,
  priceDraft,
  type CatalogState,
} from '../catalog'

type FilterValues = Pick<CatalogState, 'genre' | 'inStock' | 'minPrice' | 'maxPrice'> &
  Partial<Pick<CatalogState, 'sort'>>
type Props = { applied: CatalogState; genres: string[]; update: (values: FilterValues) => void }

function FilterForm({ applied, genres, update, mobile = false }: Props & { mobile?: boolean }) {
  const id = useId()
  const [genre, setGenre] = useState(applied.genre)
  const [sort, setSort] = useState(applied.sort)
  const [inStock, setInStock] = useState(applied.inStock)
  const [min, setMin] = useState(priceDraft(applied.minPrice))
  const [max, setMax] = useState(priceDraft(applied.maxPrice))
  const [error, setError] = useState('')
  const appliedUrl = catalogUrl(applied)
  const [draftUrl, setDraftUrl] = useState(appliedUrl)
  // Synchronize navigation without replacing focused desktop controls.
  if (draftUrl !== appliedUrl) {
    setDraftUrl(appliedUrl)
    setGenre(applied.genre)
    setSort(applied.sort)
    setInStock(applied.inStock)
    setMin(priceDraft(applied.minPrice))
    setMax(priceDraft(applied.maxPrice))
    setError('')
  }
  const options =
    applied.genre && !genres.includes(applied.genre) ? [applied.genre, ...genres] : genres
  function submit(event: FormEvent) {
    event.preventDefault()
    const range = parsePriceRange(min, max)
    if (range.error) {
      setError(range.error)
      return
    }
    setError('')
    update({
      ...(mobile ? { sort } : {}),
      genre: mobile ? genre : applied.genre,
      inStock: mobile ? inStock : applied.inStock,
      minPrice: range.minPrice,
      maxPrice: range.maxPrice,
    })
  }
  return (
    <form onSubmit={submit} className="space-y-5">
      {mobile && (
        <div>
          <label htmlFor={`${id}-sort`} className="mb-3 block text-sm font-semibold">
            Sort by
          </label>
          <select
            id={`${id}-sort`}
            value={sort}
            onChange={(event) => setSort(event.target.value as CatalogState['sort'])}
            className="min-h-11 w-full rounded-sm border border-control bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-ring"
          >
            {Object.entries(catalogSorts).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      )}
      <div>
        <label htmlFor={`${id}-genre`} className="mb-3 block text-sm font-semibold">
          Genre
        </label>
        <select
          id={`${id}-genre`}
          value={mobile ? genre : applied.genre}
          onChange={(event) => {
            if (mobile) setGenre(event.target.value)
            else
              update({
                genre: event.target.value,
                inStock: applied.inStock,
                minPrice: applied.minPrice,
                maxPrice: applied.maxPrice,
              })
          }}
          className="min-h-11 w-full rounded-sm border border-control bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-ring"
        >
          <option value="">All genres</option>
          {options.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </div>
      <fieldset>
        <legend className="mb-3 text-sm font-semibold">Availability</legend>
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={mobile ? inStock : applied.inStock}
            onChange={(event) => {
              if (mobile) setInStock(event.target.checked)
              else
                update({
                  genre: applied.genre,
                  inStock: event.target.checked,
                  minPrice: applied.minPrice,
                  maxPrice: applied.maxPrice,
                })
            }}
            className="size-4 accent-primary"
          />{' '}
          In stock only
        </label>
      </fieldset>
      <fieldset>
        <legend className="mb-3 text-sm font-semibold">Price range (USD)</legend>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor={`${id}-min`} className="mb-2 block text-xs">
              Min price
            </label>
            <Input
              id={`${id}-min`}
              inputMode="decimal"
              value={min}
              onChange={(event) => setMin(event.target.value)}
              aria-invalid={!!error}
              aria-describedby={error ? `${id}-error` : undefined}
              placeholder="0.00"
              className="min-h-11"
            />
          </div>
          <div>
            <label htmlFor={`${id}-max`} className="mb-2 block text-xs">
              Max price
            </label>
            <Input
              id={`${id}-max`}
              inputMode="decimal"
              value={max}
              onChange={(event) => setMax(event.target.value)}
              aria-invalid={!!error}
              aria-describedby={error ? `${id}-error` : undefined}
              placeholder="Any"
              className="min-h-11"
            />
          </div>
        </div>
        {error && (
          <p id={`${id}-error`} role="alert" className="mt-3 text-sm text-destructive">
            {error}
          </p>
        )}
      </fieldset>
      <Button type="submit" className="min-h-11 w-full rounded-sm">
        Apply
      </Button>
    </form>
  )
}

export function CatalogFilters(props: Props) {
  const [open, setOpen] = useState(false)
  const key = catalogUrl(props.applied)
  const count =
    Number(!!props.applied.genre) +
    Number(props.applied.inStock) +
    Number(props.applied.minPrice !== undefined || props.applied.maxPrice !== undefined)
  return (
    <>
      <div className="hidden lg:block">
        <FilterForm {...props} />
      </div>
      <div className="lg:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="min-h-11 rounded-sm px-4 text-sm">
              Filter & sort
              {count > 0 && (
                <span
                  aria-label={`${count} active filter groups`}
                  className="ml-2 rounded-full bg-primary px-2 text-primary-foreground"
                >
                  {count}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent className="w-full max-w-sm overflow-y-auto p-6">
            <SheetHeader className="px-0">
              <SheetTitle>Filter & sort</SheetTitle>
              <SheetDescription>
                Choose your shelf and order, then apply your choices.
              </SheetDescription>
            </SheetHeader>
            <FilterForm
              key={key}
              {...props}
              mobile
              update={(values) => {
                props.update(values)
                setOpen(false)
              }}
            />
          </SheetContent>
        </Sheet>
      </div>
    </>
  )
}
