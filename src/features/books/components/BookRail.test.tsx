// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { BookRail } from './BookRail'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it('moves one visible width and stops at the ends', () => {
  render(
    <BookRail label="selected books" title={<h2>Selected for your shelf</h2>}>
      <article>One</article>
      <article>Two</article>
      <article>Three</article>
    </BookRail>,
  )
  const rail = document.querySelector('.book-rail') as HTMLDivElement
  let left = 0
  Object.defineProperty(rail, 'clientWidth', { configurable: true, value: 480 })
  Object.defineProperty(rail, 'scrollWidth', { configurable: true, value: 1600 })
  Object.defineProperty(rail, 'scrollLeft', {
    configurable: true,
    get: () => left,
    set: (value: number) => {
      left = value
    },
  })
  rail.scrollTo = (options?: ScrollToOptions | number) => {
    left = typeof options === 'number' ? options : (options?.left ?? 0)
    rail.dispatchEvent(new Event('scroll'))
  }
  fireEvent.scroll(rail)

  const next = screen.getByRole('button', { name: 'Show next selected books' })
  const previous = screen.getByRole('button', { name: 'Show previous selected books' })
  expect(previous).toHaveProperty('disabled', true)
  fireEvent.click(next)
  expect(left).toBe(480)
  fireEvent.click(next)
  fireEvent.click(next)
  expect(left).toBe(1120)
  expect(next).toHaveProperty('disabled', true)
  fireEvent.click(previous)
  expect(left).toBe(640)
})

it('exposes a named carousel region for assistive technology', () => {
  render(
    <BookRail label="selected books" title={<h2>Selected for your shelf</h2>}>
      <article>One</article>
      <article>Two</article>
    </BookRail>,
  )

  expect(
    screen.getByRole('region', { name: 'selected books' }).getAttribute('aria-roledescription'),
  ).toBe('carousel')
})
