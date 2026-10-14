// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, expect, it } from 'vitest'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { BookCard } from './BookCard'
import { useCartStore, type ServerCart } from '../../cart/cart-store'

const book = {
  id: '1',
  title: 'A story',
  author: 'Author',
  genre: 'Fiction',
  description: 'Story',
  priceCents: 1200,
  stock: 20,
}
const empty: ServerCart = { revision: '0', items: [], mergeNotices: [] }
beforeEach(async () => {
  localStorage.clear()
  await useCartStore.getState().identify(null)
  useCartStore.setState({ items: [], status: 'guest' })
})
afterEach(cleanup)
const mount = (stock = 20) =>
  render(
    <MemoryRouter>
      <BookCard book={{ ...book, stock }} />
    </MemoryRouter>,
  )

it('carries validated catalog context across related-detail navigation', async () => {
  function Destination() {
    return <output>{JSON.stringify(useLocation().state)}</output>
  }
  render(
    <MemoryRouter initialEntries={['/books/9']}>
      <Routes>
        <Route
          path="/books/9"
          element={
            <BookCard
              book={book}
              catalogContext={{ catalogReturn: { url: '/books?genre=Fiction&page=2', y: 240 } }}
            />
          }
        />
        <Route path="/books/1" element={<Destination />} />
      </Routes>
    </MemoryRouter>,
  )
  await userEvent.click(screen.getByRole('link', { name: 'View A story' }))
  expect(screen.getByRole('status')).toHaveTextContent('"url":"/books?genre=Fiction&page=2"')
  expect(screen.getByRole('status')).toHaveTextContent('"y":240')
})

it('confirms a guest addition and clears feedback when the bag owner changes', async () => {
  mount()
  await userEvent.click(screen.getByRole('button', { name: 'Add to bag' }))
  expect(await screen.findByRole('link', { name: 'View bag' })).toHaveAttribute('href', '/cart')
  expect(screen.getByRole('status')).toHaveTextContent('Added')
  await act(() => useCartStore.getState().identify(undefined))
  expect(screen.queryByRole('link', { name: 'View bag' })).not.toBeInTheDocument()
})

it('explains the ten-copy limit even when more inventory exists', () => {
  useCartStore.setState({ items: [{ ...book, quantity: 10 }] })
  mount()
  expect(screen.getByRole('button', { name: 'Maximum in bag' })).toBeDisabled()
})

it('does not confirm a pending or rejected account addition', async () => {
  let reject!: (error: Error) => void
  const pending = new Promise<ServerCart>((_, fail) => {
    reject = fail
  })
  await useCartStore.getState().identify('customer', {
    read: async () => empty,
    merge: async () => empty,
    set: () => pending,
  })
  mount()
  await userEvent.click(screen.getByRole('button', { name: 'Add to bag' }))
  expect(screen.queryByRole('link', { name: 'View bag' })).not.toBeInTheDocument()
  await act(async () => {
    reject(new Error('Offline'))
  })
  await waitFor(() => expect(useCartStore.getState().status).toBe('error'))
  expect(screen.queryByRole('link', { name: 'View bag' })).not.toBeInTheDocument()
})

it('confirms an account addition only after the server accepts it', async () => {
  let resolve!: (cart: ServerCart) => void
  const pending = new Promise<ServerCart>((done) => {
    resolve = done
  })
  await useCartStore.getState().identify('customer', {
    read: async () => empty,
    merge: async () => empty,
    set: () => pending,
  })
  mount()
  await userEvent.click(screen.getByRole('button', { name: 'Add to bag' }))
  expect(screen.queryByRole('link', { name: 'View bag' })).not.toBeInTheDocument()
  await act(async () =>
    resolve({
      revision: '1',
      mergeNotices: [],
      items: [{ ...book, bookId: '1', quantity: 1, lineVersion: '1', available: true }],
    }),
  )
  expect(await screen.findByRole('link', { name: 'View bag' })).toBeInTheDocument()
})

it('clears the previous success while a second addition is pending or rejected', async () => {
  let reject!: (error: Error) => void
  let calls = 0
  const pending = new Promise<ServerCart>((_, fail) => {
    reject = fail
  })
  await useCartStore.getState().identify('customer', {
    read: async () => empty,
    merge: async () => empty,
    set: async () =>
      ++calls === 1
        ? {
            revision: '1',
            mergeNotices: [],
            items: [{ ...book, bookId: '1', quantity: 1, lineVersion: '1', available: true }],
          }
        : pending,
  })
  mount()
  await userEvent.click(screen.getByRole('button', { name: 'Add to bag' }))
  expect(await screen.findByRole('link', { name: 'View bag' })).toBeInTheDocument()
  await waitFor(() => expect(useCartStore.getState().status).toBe('ready'))
  await userEvent.click(screen.getByRole('button', { name: 'Add to bag' }))
  expect(screen.queryByRole('link', { name: 'View bag' })).not.toBeInTheDocument()
  await act(async () => reject(new Error('Offline')))
  expect(screen.queryByRole('link', { name: 'View bag' })).not.toBeInTheDocument()
})
