// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route, Link, useNavigate } from 'react-router-dom'
import { BookPage } from './BookPage'
import { useCartStore } from '../../cart/cart-store'

const book = {
  id: '1',
  title: 'A story',
  author: 'Author & Friend',
  genre: 'Art & Life',
  description: 'First paragraph\n\nSecond paragraph',
  priceCents: 1200,
  stock: 20,
}
const query = vi.hoisted(() => ({
  related: [] as unknown[],
  relatedError: false,
  calls: [] as unknown[],
  missing: false,
  stock: 20,
}))
vi.mock('@apollo/client/react', () => ({
  useQuery: (_doc: unknown, options: { variables: { id?: string }; skip?: boolean }) => {
    query.calls.push(options)
    return options.variables.id
      ? {
          data: {
            book: query.missing ? null : { ...book, id: options.variables.id, stock: query.stock },
          },
          loading: false,
          refetch: vi.fn(),
        }
      : {
          data: options.skip ? undefined : { books: { items: query.related } },
          error: query.relatedError ? new Error('Offline') : undefined,
        }
  },
}))
beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  query.related = []
  query.relatedError = false
  query.calls = []
  query.missing = false
  query.stock = 20
  useCartStore.setState({
    owner: null,
    items: [],
    status: 'guest',
    validationMessage: '',
    add: vi.fn(async () => false),
  })
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})
function BrowserBack() {
  const navigate = useNavigate()
  return <button onClick={() => navigate(-1)}>Browser back</button>
}
const mount = (state?: unknown) =>
  render(
    <MemoryRouter initialEntries={[{ pathname: '/books/1', state }]}>
      <Link to="/books/2">Next book</Link>
      <BrowserBack />
      <Routes>
        <Route path="/books/:id" element={<BookPage />} />
      </Routes>
    </MemoryRouter>,
  )

it('opens pushed detail routes at the top while leaving browser Back scroll restoration alone', async () => {
  const scroll = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  mount()
  expect(scroll).not.toHaveBeenCalled()
  await userEvent.click(screen.getByRole('link', { name: 'Next book' }))
  expect(scroll).toHaveBeenCalledExactlyOnceWith({ top: 0, behavior: 'instant' })
  await userEvent.click(screen.getByRole('button', { name: 'Browser back' }))
  expect(scroll).toHaveBeenCalledTimes(1)
})

it('clamps to accepted account stock updates even when the bag quantity stays the same', async () => {
  useCartStore.setState({
    owner: 'customer',
    status: 'ready',
    items: [{ ...book, quantity: 2, available: true }],
  })
  mount()
  await userEvent.selectOptions(screen.getByRole('combobox'), '7')
  act(() => useCartStore.setState({ items: [{ ...book, stock: 4, quantity: 2, available: true }] }))
  expect(screen.getAllByRole('option')).toHaveLength(2)
  expect(screen.getByRole('combobox')).toHaveValue('2')
  expect(screen.getByText('4 available')).toBeInTheDocument()
  act(() => useCartStore.setState({ items: [{ ...book, stock: 0, quantity: 2, available: true }] }))
  expect(screen.getByRole('button', { name: 'Sold out' })).toBeDisabled()
})

it('disables unavailable accepted account lines but trusts fresh book stock for guests', () => {
  useCartStore.setState({
    owner: 'customer',
    status: 'ready',
    items: [{ ...book, quantity: 2, available: false }],
  })
  mount()
  expect(screen.getByRole('button', { name: 'Unavailable' })).toBeDisabled()
  expect(screen.getByRole('combobox')).toBeDisabled()
  cleanup()
  useCartStore.setState({
    owner: null,
    status: 'guest',
    items: [{ ...book, stock: 2, quantity: 2, available: false }],
  })
  mount()
  expect(screen.getByRole('button', { name: 'Add to bag' })).toBeEnabled()
  expect(screen.getAllByRole('option')).toHaveLength(8)
  expect(screen.getByText('20 available')).toBeInTheDocument()
})

it('does not confirm false results, keeps existing bag navigation, and clears success at zero quantity', async () => {
  useCartStore.setState({ items: [{ ...book, quantity: 1 }] })
  mount()
  await userEvent.click(screen.getByRole('button', { name: 'Add to bag' }))
  expect(screen.getByRole('status')).toBeEmptyDOMElement()
  expect(screen.getByRole('link', { name: 'View bag' })).toBeInTheDocument()
  useCartStore.setState({
    add: vi.fn(async () => {
      useCartStore.setState({ items: [{ ...book, quantity: 2 }] })
      return true
    }),
  })
  await userEvent.click(screen.getByRole('button', { name: 'Add to bag' }))
  expect(screen.getByRole('status')).toHaveTextContent('Added 1 to your bag')
  act(() => useCartStore.setState({ items: [] }))
  expect(screen.getByRole('status')).toBeEmptyDOMElement()
})

it('labels sold-out stock and restricts low-stock increments', () => {
  query.stock = 0
  mount()
  expect(screen.getByRole('button', { name: 'Sold out' })).toBeDisabled()
  expect(screen.getByRole('combobox')).toBeDisabled()
  cleanup()
  query.stock = 4
  useCartStore.setState({ items: [{ ...book, quantity: 2 }] })
  mount()
  expect(screen.getAllByRole('option')).toHaveLength(2)
})

it('selects one complete increment, prevents duplicates while pending, and confirms only acceptance', async () => {
  let resolve!: (accepted: boolean) => void
  const add = vi.fn(
    () =>
      new Promise<boolean>((done) => {
        resolve = done
      }),
  )
  useCartStore.setState({ add })
  mount()
  await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Quantity' }), '3')
  await userEvent.click(screen.getByRole('button', { name: 'Add to bag' }))
  expect(add).toHaveBeenCalledWith(book, 3)
  expect(screen.getByRole('button', { name: 'Adding…' })).toBeDisabled()
  expect(screen.queryByText('Added 3 to your bag')).not.toBeInTheDocument()
  await act(async () => {
    useCartStore.setState({ items: [{ ...book, quantity: 3 }] })
    resolve(true)
  })
  expect(await screen.findByText('Added 3 to your bag')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /View bag/ })).toHaveAttribute('href', '/cart')
})

it('never announces a rejected addition or stale owner completion, even after returning to the same owner', async () => {
  let resolve!: (accepted: boolean) => void
  useCartStore.setState({
    add: vi.fn(
      () =>
        new Promise<boolean>((done) => {
          resolve = done
        }),
    ),
  })
  mount()
  await userEvent.click(screen.getByRole('button', { name: 'Add to bag' }))
  act(() => {
    useCartStore.setState({ owner: 'other' })
    useCartStore.setState({ owner: null, items: [{ ...book, quantity: 1 }] })
  })
  await act(async () => resolve(true))
  expect(screen.queryByText(/Added \d to your bag/)).not.toBeInTheDocument()
})

it('clamps remaining choices and labels the ten-copy cap truthfully', async () => {
  mount()
  await userEvent.selectOptions(screen.getByRole('combobox'), '8')
  act(() => useCartStore.setState({ items: [{ ...book, quantity: 7 }] }))
  await waitFor(() => expect(screen.getByRole('combobox')).toHaveValue('3'))
  expect(screen.getAllByRole('option')).toHaveLength(3)
  act(() => useCartStore.setState({ items: [{ ...book, quantity: 10 }] }))
  expect(screen.getByRole('button', { name: 'Maximum in bag' })).toBeDisabled()
})

it('resets selection on route change and cannot confirm a previous book attempt', async () => {
  let resolve!: (accepted: boolean) => void
  useCartStore.setState({
    add: vi.fn(
      () =>
        new Promise<boolean>((done) => {
          resolve = done
        }),
    ),
  })
  mount()
  await userEvent.selectOptions(screen.getByRole('combobox'), '4')
  await userEvent.click(screen.getByRole('button', { name: 'Add to bag' }))
  await userEvent.click(screen.getByRole('link', { name: 'Next book' }))
  expect(screen.getByRole('combobox')).toHaveValue('1')
  await act(async () => resolve(true))
  expect(screen.queryByText(/Added \d to your bag/)).not.toBeInTheDocument()
})

it('links discovery to fresh encoded filters and bounds, excludes, and deduplicates related books', () => {
  query.related = [
    book,
    { ...book, id: '2', title: 'Related' },
    { ...book, id: '2', title: 'Duplicate' },
    ...['3', '4', '5', '6'].map((id) => ({ ...book, id, title: `Related ${id}` })),
  ]
  mount({ catalogReturn: { url: '/books?genre=Fiction&page=2', y: 240 } })
  expect(screen.getByRole('link', { name: book.author })).toHaveAttribute(
    'href',
    '/books?search=Author+%26+Friend',
  )
  expect(screen.getByRole('link', { name: book.genre })).toHaveAttribute(
    'href',
    '/books?genre=Art+%26+Life',
  )
  expect(query.calls).toContainEqual(
    expect.objectContaining({ variables: { genre: book.genre }, skip: false }),
  )
  expect(screen.getAllByRole('article')).toHaveLength(4)
  expect(screen.queryByText('Duplicate')).not.toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'About this book' })).toBeInTheDocument()
})

it('isolates related failures and skips related requests for missing books', () => {
  query.relatedError = true
  mount()
  expect(screen.getByRole('button', { name: 'Add to bag' })).toBeEnabled()
  expect(screen.queryByRole('heading', { name: 'More in this genre' })).not.toBeInTheDocument()
  cleanup()
  query.missing = true
  mount()
  expect(screen.getByRole('heading', { name: 'Book not found' })).toBeInTheDocument()
  expect(query.calls.at(-1)).toEqual(expect.objectContaining({ skip: true }))
})

it('separates the translated byline label from the isolated author link', () => {
  mount()
  expect(screen.getByRole('link', { name: book.author }).parentElement).toHaveTextContent(
    'by Author & Friend',
  )
})
