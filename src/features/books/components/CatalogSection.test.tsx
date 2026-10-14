// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MockedProvider } from '@apollo/client/testing/react'
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom'
import { BooksDocument } from '../../../generated/graphql'
import { CatalogSection } from './CatalogSection'
import { TooltipProvider } from '../../../app/components/ui/tooltip'

afterEach(cleanup)
vi.mock('../catalog-navigation', () => ({ useCatalogScroll: vi.fn() }))
vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
)
function RouterControls() {
  const location = useLocation(),
    navigate = useNavigate()
  return (
    <>
      <output aria-label="Current URL">{location.search}</output>
      <output aria-label="Current hash">{location.hash}</output>
      <button onClick={() => navigate(-1)}>Back</button>
    </>
  )
}
function mount(url = '/', total = 25) {
  const variables = vi.fn(() => true)
  render(
    <MockedProvider
      mocks={[
        {
          request: { query: BooksDocument, variables },
          result: { data: { books: { total, items: [] }, genres: ['Fiction', 'Fantasy'] } },
          maxUsageCount: 30,
          delay: 0,
        },
      ]}
    >
      <MemoryRouter initialEntries={[url]}>
        <TooltipProvider>
          <CatalogSection />
        </TooltipProvider>
        <RouterControls />
      </MemoryRouter>
    </MockedProvider>,
  )
  return { user: userEvent.setup(), variables }
}
it('preserves combined filters and server sorting across pagination and history', async () => {
  const { user, variables } = mount(
    '/?search=reader&genre=Fiction&sort=price-asc&inStock=1&minPrice=0&maxPrice=2000&page=1',
  )
  await screen.findByText('Page 2 of 3')
  expect(variables).toHaveBeenCalledWith({
    search: 'reader',
    genre: 'Fiction',
    sort: 'PRICE_ASC',
    inStockOnly: true,
    minPriceCents: 0,
    maxPriceCents: 2000,
    limit: 12,
    offset: 12,
  })
  await user.click(screen.getByRole('button', { name: 'Next' }))
  await screen.findByText('Page 3 of 3')
  expect(screen.getByRole('button', { name: 'Next' })).toHaveProperty('disabled', true)
  expect(screen.getByLabelText('Current URL').textContent).toContain(
    'genre=Fiction&sort=price-asc&inStock=1&minPrice=0&maxPrice=2000&page=2',
  )
  await user.click(screen.getByRole('button', { name: 'Back' }))
  await screen.findByText('Page 2 of 3')
})
it('keeps search as an unsent draft, preserves filters on submit, and synchronizes history controls', async () => {
  const { user, variables } = mount('/?search=old&genre=Fiction&sort=price-desc&page=2')
  await screen.findByText('Page 3 of 3')
  const input = screen.getByRole('textbox', { name: 'Search books' })
  const requestCount = variables.mock.calls.length
  await user.clear(input)
  await user.type(input, '  new title  ')
  expect(variables.mock.calls.length).toBe(requestCount)
  await user.click(screen.getByRole('button', { name: 'Search books' }))
  await screen.findByText('Page 1 of 3')
  expect(screen.getByLabelText('Current URL').textContent).toBe(
    '?search=new+title&genre=Fiction&sort=price-desc',
  )
  await user.click(screen.getByRole('button', { name: 'Back' }))
  await screen.findByText('Page 3 of 3')
  expect(input).toHaveProperty('value', 'old')
})
it('applies genre independently, removes individual chips, and resets all applied state', async () => {
  const { user } = mount('/?search=reader&sort=title-asc&minPrice=0&page=2')
  await user.selectOptions(await screen.findByLabelText('Genre'), 'Fiction')
  await screen.findByText('Page 1 of 3')
  expect(screen.getByLabelText('Current URL').textContent).toBe(
    '?search=reader&genre=Fiction&sort=title-asc&minPrice=0',
  )
  expect(screen.getByRole('textbox', { name: 'Search books' })).toHaveProperty('value', 'reader')
  await user.click(screen.getByRole('button', { name: 'Remove price range filter' }))
  expect(screen.getByLabelText('Current URL').textContent).toBe(
    '?search=reader&genre=Fiction&sort=title-asc',
  )
  await user.click(screen.getByRole('button', { name: 'Remove genre filter' }))
  expect(screen.getByLabelText('Current URL').textContent).toBe('?search=reader&sort=title-asc')
  await user.click(screen.getByRole('button', { name: 'Clear all' }))
  expect(screen.getByLabelText('Current URL').textContent).toBe('')
  expect(screen.getByLabelText('Sort by')).toHaveProperty('value', 'default')
})
it('normalizes invalid URLs and corrects stale pages only after successful responses', async () => {
  const { variables } = mount(
    '/?search=+reader+&genre=Unknown&sort=bad&inStock=yes&minPrice=200&maxPrice=100&page=99',
  )
  await waitFor(() =>
    expect(screen.getByLabelText('Current URL').textContent).toBe(
      '?search=reader&genre=Unknown&page=2',
    ),
  )
  expect(variables).toHaveBeenCalledWith(
    expect.objectContaining({ search: 'reader', genre: 'Unknown', offset: 24 }),
  )
  expect(screen.getByLabelText('Genre')).toHaveProperty('value', 'Unknown')
})
it('resets a stale page when no results remain', async () => {
  mount('/?genre=Unknown&page=3', 0)
  await screen.findByText('No books on this shelf.')
  await waitFor(() =>
    expect(screen.getByLabelText('Current URL').textContent).toBe('?genre=Unknown'),
  )
})

it('preserves unrelated bookmark parameters during automatic page correction', async () => {
  mount('/?genre=Fiction&page=99&extra=yes#legacy')
  await waitFor(() =>
    expect(screen.getByLabelText('Current URL').textContent).toBe(
      '?genre=Fiction&page=2&extra=yes',
    ),
  )
  expect(screen.getByLabelText('Current hash').textContent).toBe('#legacy')
})

it('preserves legacy hashes when normalizing default and invalid URL parameters', async () => {
  mount('/?search=&sort=default&inStock=invalid&page=bad&extra=yes#legacy')
  await waitFor(() => expect(screen.getByLabelText('Current URL').textContent).toBe('?extra=yes'))
  expect(screen.getByLabelText('Current hash').textContent).toBe('#legacy')
})
