export const PAGE_SIZE = 12

export const catalogSorts = {
  default: 'Default order',
  'title-asc': 'Title: A–Z',
  'price-asc': 'Price: low to high',
  'price-desc': 'Price: high to low',
} as const
export type CatalogState = {
  search: string
  genre: string
  sort: keyof typeof catalogSorts
  inStock: boolean
  minPrice?: number
  maxPrice?: number
  page: number
}
const integer = (value: string | null, maximum: number) => {
  if (value === null || !/^\d+$/.test(value)) return undefined
  const number = Number(value)
  return Number.isSafeInteger(number) && number <= maximum ? number : undefined
}
export function parseCatalog(params: URLSearchParams): CatalogState {
  let minPrice = integer(params.get('minPrice'), 1000000)
  let maxPrice = integer(params.get('maxPrice'), 1000000)
  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    minPrice = undefined
    maxPrice = undefined
  }
  const sort = params.get('sort')
  return {
    search: (params.get('search') || '').trim().slice(0, 100),
    genre: (params.get('genre') || '').trim().slice(0, 100),
    sort: sort && Object.hasOwn(catalogSorts, sort) ? (sort as CatalogState['sort']) : 'default',
    inStock: params.get('inStock') === '1',
    minPrice,
    maxPrice,
    page: integer(params.get('page'), Math.floor(2147483647 / PAGE_SIZE)) ?? 0,
  }
}
export function catalogParams(state: CatalogState) {
  const params = new URLSearchParams()
  if (state.search) params.set('search', state.search)
  if (state.genre) params.set('genre', state.genre)
  if (state.sort !== 'default') params.set('sort', state.sort)
  if (state.inStock) params.set('inStock', '1')
  if (state.minPrice !== undefined) params.set('minPrice', String(state.minPrice))
  if (state.maxPrice !== undefined) params.set('maxPrice', String(state.maxPrice))
  if (state.page) params.set('page', String(state.page))
  return params
}
export function catalogUrl(state: CatalogState) {
  const query = catalogParams(state).toString()
  return `/books${query ? `?${query}` : ''}`
}
export function priceDraft(cents?: number) {
  return cents === undefined
    ? ''
    : `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`
}
export function parsePriceRange(
  min: string,
  max: string,
): { minPrice?: number; maxPrice?: number; error?: string } {
  const parse = (value: string) => {
    const text = value.trim()
    if (!text) return undefined
    if (!/^\d+(?:\.\d{1,2})?$/.test(text)) return NaN
    const [whole, fraction = ''] = text.split('.')
    const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
    return Number.isSafeInteger(cents) && cents <= 1000000 ? cents : NaN
  }
  const minPrice = parse(min),
    maxPrice = parse(max)
  if (Number.isNaN(minPrice) || Number.isNaN(maxPrice))
    return { error: 'Enter a price from 0 to 10000 with at most two decimal places.' }
  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice)
    return { error: 'Min price must be no greater than Max price.' }
  return { minPrice, maxPrice }
}
