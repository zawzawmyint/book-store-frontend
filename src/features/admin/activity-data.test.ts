import { expect, it } from 'vitest'
import {
  activityValue,
  booksReturnTo,
  localDateBound,
  readActivityFilters,
  validBookId,
} from './activity-data'

it('converts inclusive local calendar dates to midnight bounds and rejects impossible dates', () => {
  const from = new Date(2026, 2, 8)
  const to = new Date(2026, 2, 9)
  expect(localDateBound('2026-03-08')).toBe(from.toISOString())
  expect(localDateBound('2026-03-08', true)).toBe(to.toISOString())
  expect(localDateBound('2026-02-30')).toBeUndefined()
  expect(localDateBound('2026-13-01')).toBeUndefined()
  expect(localDateBound('2026-01-01T00:00:00Z')).toBeUndefined()
})
it('combines actor, action, price and inclusive dates with safe fallback for unknown enums', () => {
  const result = readActivityFilters(
    new URLSearchParams(
      'actorUserId=ada&action=BOOK_UPDATED&changedField=PRICE_CENTS&from=2026-03-08&to=2026-03-08',
    ),
  )
  expect(result.error).toBe('')
  expect(result.variables).toEqual({
    actorUserId: 'ada',
    action: 'BOOK_UPDATED',
    changedField: 'PRICE_CENTS',
    from: new Date(2026, 2, 8).toISOString(),
    to: new Date(2026, 2, 9).toISOString(),
  })
  expect(
    readActivityFilters(new URLSearchParams('action=INVALID&changedField=INVALID')).variables,
  ).toEqual({})
})
it('rejects malformed actor IDs and reversed ranges before requesting history', () => {
  for (const params of [
    'actorUserId=%20',
    'actorUserId=two%20words',
    'from=2026-02-30',
    'from=2026-04-02&to=2026-04-01',
  ]) {
    expect(readActivityFilters(new URLSearchParams(params)).error).not.toBe('')
  }
  expect(validBookId('1')).toBe(true)
  for (const id of ['0', '-1', '1x', '1/2', '99999999999999999999'])
    expect(validBookId(id)).toBe(false)
})
it('formats validated cents, roles, archive states and nulls without interpreting stored text', () => {
  expect(activityValue('PRICE_CENTS', '1299')).toBe('$12.99')
  expect(activityValue('PRICE_CENTS', '12x')).toBe('12x')
  expect(activityValue('ROLE', 'STAFF')).toBe('Staff')
  expect(activityValue('ARCHIVED', 'false')).toBe('Active')
  expect(activityValue('TITLE', null)).toBe('Not previously set')
  expect(activityValue('DESCRIPTION', '<img src=x>')).toBe('<img src=x>')
})
it('allows only the books list return location', () => {
  expect(booksReturnTo('/admin/books?filter=ARCHIVED&page=2')).toBe(
    '/admin/books?filter=ARCHIVED&page=2',
  )
  for (const value of [
    '//evil.invalid/admin/books',
    '/admin/books/1/edit',
    'https://evil.invalid',
    '/admin/books\\evil',
    undefined,
  ])
    expect(booksReturnTo(value)).toBe('/admin/books')
})
