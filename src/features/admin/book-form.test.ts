import { expect, it } from 'vitest'
import { localize, setLanguage } from '../../lib/i18n'
import { bookSaveNotice } from './book-form'

it('restores only known serializable book-save notice kinds after reload', async () => {
  const saved = JSON.parse(JSON.stringify({ kind: 'book-updated' }))
  expect(localize(bookSaveNotice(saved))).toBe('Book updated.')
  await setLanguage('zh-Hans')
  expect(localize(bookSaveNotice(saved))).not.toContain('@i18n/')
  expect(bookSaveNotice({ kind: 'common:adminRole' })).toBe('')
  expect(bookSaveNotice('Book updated.')).toBe('')
  await setLanguage('en')
})

it('parses prices exactly and rejects invalid admin values', async () => {
  const module = await import('./book-form').catch(() => null)
  expect(module, 'admin form validation must exist').not.toBeNull()
  const { parsePriceCents, bookFormSchema } = module!
  expect(parsePriceCents('0')).toBe(0)
  expect(parsePriceCents('12.34')).toBe(1234)
  expect(parsePriceCents('0.10')).toBe(10)
  for (const value of ['-1', '1.001', '10000.01', '1e2', '', 'NaN'])
    expect(() => parsePriceCents(value)).toThrow()
  const values = {
    title: ' Title ',
    author: 'Author',
    genre: 'Genre',
    description: 'Description',
    price: '12.34',
  }
  expect(bookFormSchema.parse(values).title).toBe('Title')
  expect(bookFormSchema.safeParse({ ...values, title: ' ' }).success).toBe(false)
  expect(bookFormSchema.safeParse({ ...values, description: 'x'.repeat(5001) }).success).toBe(false)
})
