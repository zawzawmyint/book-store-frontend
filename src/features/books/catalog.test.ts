import { expect, it } from 'vitest'
import { parseCatalog, catalogParams, parsePriceRange, catalogUrl } from './catalog'

it('normalizes unsupported and unsafe URL values without losing valid filters', () => {
  const state = parseCatalog(
    new URLSearchParams(
      'search=+reader+&genre=+Unknown+&sort=no&inStock=true&page=1.5&minPrice=200&maxPrice=100',
    ),
  )
  expect(catalogParams(state).toString()).toBe('search=reader&genre=Unknown')
  expect(parseCatalog(new URLSearchParams('page=9007199254740992&minPrice=1e2')).page).toBe(0)
  expect(
    catalogUrl(parseCatalog(new URLSearchParams('genre=Fiction&minPrice=0&sort=price-asc&page=2'))),
  ).toBe('/books?genre=Fiction&sort=price-asc&minPrice=0&page=2')
})

it('converts major-unit price drafts exactly and rejects ambiguous or reversed input', () => {
  expect(parsePriceRange('0', '12.50')).toEqual({ minPrice: 0, maxPrice: 1250 })
  expect(parsePriceRange('', '10000.00')).toEqual({ minPrice: undefined, maxPrice: 1000000 })
  for (const value of ['-1', '1e2', '0.001', '10000.01', '1.'])
    expect(parsePriceRange(value, '')).toHaveProperty('error')
  expect(parsePriceRange('12.50', '12.49')).toHaveProperty('error')
})
