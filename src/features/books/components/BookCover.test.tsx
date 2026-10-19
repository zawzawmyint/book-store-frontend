// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { BookCover } from './BookCover'
afterEach(cleanup)
it('shows real artwork, falls back after failure, and retries a replacement URL', () => {
  const props = {
    id: '1',
    title: 'A book',
    author: 'An author',
    cover: { url: 'https://example.test/first.webp', width: 800, height: 1200 },
  }
  const { rerender } = render(<BookCover {...props} />)
  expect(screen.getByAltText('Cover of A book').getAttribute('src')).toBe(props.cover.url)
  fireEvent.error(screen.getByAltText('Cover of A book'))
  expect(screen.getByRole('img', { name: 'Cover design for A book' })).toBeTruthy()
  rerender(
    <BookCover
      {...props}
      cover={{ ...props.cover, url: 'https://example.test/replacement.webp' }}
    />,
  )
  expect(screen.getByAltText('Cover of A book').getAttribute('src')).toContain('replacement.webp')
})
it('keeps decorative generated covers hidden from the accessibility tree, including failed images', () => {
  const props = { id: '1', title: 'A book', author: 'An author', decorative: true }
  const { rerender } = render(<BookCover {...props} />)
  expect(screen.queryByRole('img')).toBeNull()
  expect(screen.getByText('A book').closest('[aria-hidden]')?.getAttribute('aria-hidden')).toBe(
    'true',
  )
  rerender(
    <BookCover
      {...props}
      cover={{ url: 'https://example.test/fails.webp', width: 800, height: 1200 }}
    />,
  )
  fireEvent.error(screen.getByAltText(''))
  expect(screen.queryByRole('img')).toBeNull()
  expect(screen.getByText('A book').closest('[aria-hidden]')?.getAttribute('aria-hidden')).toBe(
    'true',
  )
})
