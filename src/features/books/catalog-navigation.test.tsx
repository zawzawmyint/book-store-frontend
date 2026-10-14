// @vitest-environment jsdom
import { expect, it, vi } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { Link, MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom'
import { readCatalogReturn, useCatalogScroll } from './catalog-navigation'

it('accepts a local catalog return and removes unsupported URL values', () => {
  expect(
    readCatalogReturn({
      catalogReturn: { url: '/books?genre=Fiction&sort=price-asc&extra=x', y: 500 },
    }),
  ).toEqual({ url: '/books?genre=Fiction&sort=price-asc', y: 500 })
})

it('retains the saved history position while returning results are loading', async () => {
  const scroll = vi.fn()
  vi.stubGlobal('scrollTo', scroll)
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    callback(0)
    return 1
  })
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
  vi.spyOn(document.documentElement, 'scrollHeight', 'get').mockReturnValue(5000)
  let initiallyReady = true
  function Catalog() {
    const [ready, setReady] = useState(initiallyReady)
    useCatalogScroll(ready)
    return (
      <>
        <Link to="/books/1">Open book</Link>
        <button onClick={() => setReady(true)}>Results ready</button>
      </>
    )
  }
  function Book() {
    const navigate = useNavigate()
    return <button onClick={() => navigate(-1)}>Return</button>
  }
  try {
    render(
      <MemoryRouter initialEntries={['/books']}>
        <Routes>
          <Route path="/books" element={<Catalog />} />
          <Route path="/books/1" element={<Book />} />
        </Routes>
      </MemoryRouter>,
    )
    vi.stubGlobal('scrollY', 800)
    window.dispatchEvent(new Event('scroll'))
    await act(async () => screen.getByRole('link', { name: 'Open book' }).click())
    initiallyReady = false
    await act(async () => screen.getByRole('button', { name: 'Return' }).click())
    vi.stubGlobal('scrollY', 0)
    window.dispatchEvent(new Event('scroll'))
    await act(async () => screen.getByRole('button', { name: 'Results ready' }).click())
    expect(scroll).toHaveBeenLastCalledWith({ top: 800, behavior: 'instant' })
  } finally {
    cleanup()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  }
})
it('rejects external, malformed, and noncatalog return destinations', () => {
  for (const url of [
    'https://example.com/books',
    '//example.com/books',
    '/admin',
    '/books/1',
    '/books\\evil',
  ])
    expect(readCatalogReturn({ catalogReturn: { url, y: 10 } })).toBeNull()
  expect(readCatalogReturn({ catalogReturn: { url: '/books', y: -1 } })).toBeNull()
  expect(readCatalogReturn({ catalogReturn: { url: '/books', y: Infinity } })).toBeNull()
})
