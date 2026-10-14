// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ApolloClient, ApolloLink, InMemoryCache } from '@apollo/client'
import { ApolloProvider } from '@apollo/client/react'
import { Observable } from 'rxjs'
import {
  MemoryRouter,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useNavigationType,
} from 'react-router-dom'
import { HomePage } from './HomePage'
import { TooltipProvider } from '../../../app/components/ui/tooltip'
import { useCartStore } from '../../cart/cart-store'
import type { StorefrontHomeQuery } from '../../../generated/graphql'

vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
)
const book = (id: string, title: string, stock = 5) => ({
  __typename: 'Book' as const,
  id,
  title,
  author: 'API Author',
  genre: 'Classic Fiction',
  description: 'An API description',
  priceCents: 1200,
  stock,
})
const data: StorefrontHomeQuery = {
  first: book('1', 'API First'),
  second: book('2', 'API Second'),
  third: book('4', 'API Third'),
  fourth: book('8', 'API Fourth'),
  genres: ['Classic Fiction', 'Fantasy'],
}
beforeEach(() => {
  void useCartStore.getState().identify(null)
  useCartStore.setState({ items: [], status: 'guest' })
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})
function Location() {
  const location = useLocation(),
    navigate = useNavigate(),
    type = useNavigationType()
  return (
    <>
      <output aria-label="Current URL">
        {location.pathname + location.search + location.hash}
      </output>
      <output aria-label="Navigation type">{type}</output>
      <button onClick={() => navigate(-1)}>Back</button>
    </>
  )
}
function mount({
  url = '/',
  result = data,
  failing = false,
  partialError = false,
  delay = 0,
} = {}) {
  const operations: { name: string; variables: Record<string, unknown> }[] = []
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink(
      (operation) =>
        new Observable((observer) => {
          operations.push({ name: operation.operationName ?? '', variables: operation.variables })
          const timer = setTimeout(() => {
            if (failing) observer.error(new Error('API unavailable'))
            else {
              observer.next({
                data: result,
                ...(partialError ? { errors: [{ message: 'Some selections failed' }] } : {}),
              })
              observer.complete()
            }
          }, delay)
          return () => clearTimeout(timer)
        }),
    ),
  })
  render(
    <ApolloProvider client={client}>
      <MemoryRouter initialEntries={['/previous', url]} initialIndex={1}>
        <TooltipProvider>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/books" element={<h1>Catalog destination</h1>} />
            <Route path="/previous" element={<h1>Previous page</h1>} />
          </Routes>
          <Location />
        </TooltipProvider>
      </MemoryRouter>
    </ApolloProvider>,
  )
  return { operations, user: userEvent.setup() }
}

it('shows explicit API-backed selections in order with working genre and recommendation links', async () => {
  const { operations } = mount()
  await screen.findByRole('link', { name: 'API First' })
  const shelf = await screen.findByRole('region', { name: 'Selected for your shelf' })
  expect(
    within(shelf)
      .getAllByRole('article')
      .map((article) => within(article).getByRole('link', { name: /^API/ }).textContent),
  ).toEqual(['API First', 'API Second', 'API Third', 'API Fourth'])
  expect(screen.getByRole('link', { name: 'Classic Fiction' }).getAttribute('href')).toBe(
    '/books?search=Classic+Fiction',
  )
  expect(screen.getByRole('link', { name: /Discover this book/ }).getAttribute('href')).toBe(
    '/books/1',
  )
  expect(screen.queryByRole('button', { name: 'Next' })).toBeNull()
  expect(operations).toEqual([
    {
      name: 'StorefrontHome',
      variables: { firstId: '1', secondId: '2', thirdId: '4', fourthId: '8' },
    },
  ])
})

it('omits missing selections and their editorial note while keeping sold-out cards disabled', async () => {
  mount({
    result: { ...data, first: null, third: null, second: book('2', 'Sold Out', 0) } as typeof data,
  })
  const shelf = await screen.findByRole('region', { name: 'Selected for your shelf' })
  await screen.findByRole('link', { name: 'Sold Out' })
  expect(within(shelf).getAllByRole('article')).toHaveLength(2)
  expect(screen.getByRole('button', { name: 'Sold out' })).toHaveProperty('disabled', true)
  expect(screen.queryByRole('link', { name: /Discover this book/ })).toBeNull()
  expect(screen.queryByText('The Great Gatsby')).toBeNull()
})

it('distinguishes loading from empty and keeps an empty homepage useful', async () => {
  mount({
    result: {
      ...data,
      first: null,
      second: null,
      third: null,
      fourth: null,
      genres: [],
    } as unknown as typeof data,
    delay: 20,
  })
  expect(
    within(screen.getByRole('region', { name: 'Selected for your shelf' })).getByRole('status')
      .textContent,
  ).toMatch(/loading|opening/i)
  expect(screen.queryByText(/No selections/)).toBeNull()
  await screen.findByText(/No selections/)
  expect(screen.getByRole('link', { name: /Browse all books/ }).getAttribute('href')).toBe('/books')
  expect(screen.queryAllByRole('img')).toHaveLength(0)
})

it('retains the bag and static navigation when homepage data and its retry fail', async () => {
  useCartStore.setState({ items: [{ ...book('1', 'In my bag'), quantity: 1 }] })
  const { user, operations } = mount({ failing: true })
  expect((await screen.findByRole('alert')).textContent).toMatch(/could not load/i)
  expect(screen.getByRole('button', { name: /Try again/ })).toBeTruthy()
  expect(screen.getByRole('link', { name: /Browse all books/ })).toBeTruthy()
  expect(useCartStore.getState().items[0].title).toBe('In my bag')
  expect(screen.queryByRole('link', { name: /Discover this book/ })).toBeNull()
  await user.click(screen.getByRole('button', { name: /Try again/ }))
  await waitFor(() => expect(operations).toHaveLength(2))
  expect((await screen.findByRole('alert')).textContent).toMatch(/could not load/i)
})

it('does not display partial GraphQL error data as a successful editorial selection', async () => {
  mount({ partialError: true })
  await screen.findByRole('alert')
  expect(screen.queryByRole('link', { name: 'API First' })).toBeNull()
  expect(screen.queryByRole('link', { name: /Discover this book/ })).toBeNull()
  expect(screen.queryAllByRole('img')).toHaveLength(0)
})

it.each([
  ['/?search=&page=2&extra=yes#other', '/books?search=&page=2&extra=yes#other'],
  ['/?search=Jane#collection', '/books?search=Jane'],
  ['/#collection', '/books'],
])('replaces legacy catalog URL %s without querying homepage content', async (url, expected) => {
  const { user, operations } = mount({ url })
  await screen.findByRole('heading', { name: 'Catalog destination' })
  expect(screen.getByLabelText('Current URL').textContent).toBe(expected)
  expect(screen.getByLabelText('Navigation type').textContent).toBe('REPLACE')
  expect(operations).toEqual([])
  await user.click(screen.getByRole('button', { name: 'Back' }))
  await screen.findByRole('heading', { name: 'Previous page' })
})

it('keeps unrelated homepage parameters on the homepage', async () => {
  mount({ url: '/?campaign=autumn#intro' })
  await waitFor(() =>
    expect(screen.getByLabelText('Current URL').textContent).toBe('/?campaign=autumn#intro'),
  )
  expect(screen.queryByRole('heading', { name: 'Catalog destination' })).toBeNull()
})

it('uses available genres for moods and the current selected author for discovery', async () => {
  mount()
  const moods = await screen.findByRole('region', { name: 'Find your reading mood' })
  expect(
    within(moods)
      .getByRole('link', { name: /A little imagination/ })
      .getAttribute('href'),
  ).toBe('/books?search=Fantasy')
  expect(within(moods).queryByRole('link', { name: /A little adventure/ })).toBeNull()
  const author = screen.getByRole('region', { name: 'Explore an author' })
  expect(
    within(author).getByRole('link', { name: 'Explore books by API Author' }).getAttribute('href'),
  ).toBe('/books?search=API+Author')
})

it('omits author and mood sections when no matching data is available', async () => {
  mount({
    result: {
      ...data,
      first: null,
      second: null,
      third: null,
      fourth: null,
      genres: [],
    } as unknown as typeof data,
  })
  await screen.findByText(/No selections/)
  expect(screen.queryByRole('region', { name: 'Explore an author' })).toBeNull()
  expect(screen.queryByRole('region', { name: 'Find your reading mood' })).toBeNull()
})
