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

vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
)

function RouterControls() {
  const location = useLocation()
  const navigate = useNavigate()
  return (
    <>
      <output aria-label="Current URL">{location.search}</output>
      <button onClick={() => navigate(-1)}>Back</button>
    </>
  )
}

function mount(url = '/') {
  const variables = vi.fn(() => true)
  render(
    <MockedProvider
      mocks={[
        {
          request: { query: BooksDocument, variables },
          result: { data: { books: { total: 25, items: [] }, genres: ['Fiction'] } },
          maxUsageCount: 20,
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

it('keeps twelve-item zero-based pages, search, and browser history', async () => {
  const { user, variables } = mount('/?search=reader&page=1')
  await screen.findByText('Page 2')
  expect(variables).toHaveBeenCalledWith({ search: 'reader', limit: 12, offset: 12 })
  await user.click(screen.getByRole('button', { name: 'Next' }))
  await screen.findByText('Page 3')
  expect(screen.getByRole('button', { name: 'Next' })).toHaveProperty('disabled', true)
  expect(screen.getByLabelText('Current URL').textContent).toBe('?search=reader&page=2')
  await user.click(screen.getByRole('button', { name: 'Previous' }))
  await screen.findByText('Page 2')
  await user.click(screen.getByRole('button', { name: 'Back' }))
  await screen.findByText('Page 3')
})

it('trims submitted search, replaces filter parameters, and retains the draft during Back', async () => {
  const { user, variables } = mount('/?search=old&page=2&extra=value')
  await screen.findByText('Page 3')
  const input = screen.getByRole('textbox', { name: 'Search books' })
  await user.clear(input)
  await user.type(input, '  new title  ')
  await user.click(screen.getByRole('button', { name: 'Search books' }))
  await screen.findByText('Page 1')
  expect(screen.getByLabelText('Current URL').textContent).toBe('?search=new+title')
  await waitFor(() =>
    expect(variables).toHaveBeenCalledWith({ search: 'new title', limit: 12, offset: 0 }),
  )
  await user.click(screen.getByRole('button', { name: 'Back' }))
  await screen.findByText('Page 3')
  expect(input).toHaveProperty('value', '  new title  ')
})

it('genre selection updates the draft and resets the page; clearing restores all books', async () => {
  const { user } = mount('/?search=reader&page=2')
  await user.click(await screen.findByRole('button', { name: 'Fiction' }))
  await screen.findByText('Page 1')
  expect(screen.getByLabelText('Current URL').textContent).toBe('?search=Fiction')
  expect(screen.getByRole('textbox', { name: 'Search books' })).toHaveProperty('value', 'Fiction')
  expect(screen.getByRole('button', { name: 'Fiction' }).getAttribute('aria-pressed')).toBe('true')
  await user.click(screen.getByRole('button', { name: 'Clear search' }))
  await screen.findByText('Page 1')
  expect(screen.getByLabelText('Current URL').textContent).toBe('')
  expect(screen.getByRole('textbox', { name: 'Search books' })).toHaveProperty('value', '')
  expect(screen.getByRole('button', { name: 'Previous' })).toHaveProperty('disabled', true)
})

it.each(['-1', 'invalid'])(
  'retains existing parsing of %s without rewriting the URL',
  async (page) => {
    const { variables } = mount(`/?page=${page}`)
    await screen.findByText('Page 1')
    expect(variables).toHaveBeenCalledWith({ search: '', limit: 12, offset: 0 })
    expect(screen.getByLabelText('Current URL').textContent).toBe(`?page=${page}`)
  },
)
