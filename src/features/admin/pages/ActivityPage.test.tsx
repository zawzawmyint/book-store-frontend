// @vitest-environment jsdom
import { TooltipProvider } from '../../../app/components/ui/tooltip'
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MockedProvider } from '@apollo/client/testing/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ActivityPage } from './ActivityPage'
import { BookHistoryPage } from './BookHistoryPage'
import { AdminActivityDocument } from '../../../generated/graphql'
import userEvent from '@testing-library/user-event'
vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
)
afterEach(cleanup)
it('submits combined filters deliberately and preserves them during pagination', async () => {
  const first = vi.fn(() => ({ data: { adminActivity: { total: 6, items: [] } } }))
  const second = vi.fn(() => ({ data: { adminActivity: { total: 6, items: [] } } }))
  renderWithTooltip(
    <MockedProvider
      mocks={[
        {
          request: { query: AdminActivityDocument, variables: { limit: 5, offset: 0 } },
          result: { data: { adminActivity: { total: 0, items: [] } } },
        },
        {
          request: {
            query: AdminActivityDocument,
            variables: { actorUserId: 'ada', changedField: 'PRICE_CENTS', limit: 5, offset: 0 },
          },
          result: first,
        },
        {
          request: {
            query: AdminActivityDocument,
            variables: { actorUserId: 'ada', changedField: 'PRICE_CENTS', limit: 5, offset: 5 },
          },
          result: second,
        },
      ]}
    >
      <MemoryRouter>
        <ActivityPage />
      </MemoryRouter>
    </MockedProvider>,
  )
  await screen.findByText('No activity recorded yet')
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('Actor user ID'), 'ada')
  await user.click(screen.getByLabelText('Price changes only'))
  expect(first).not.toHaveBeenCalled()
  await user.click(screen.getByRole('button', { name: 'Apply filters' }))
  await vi.waitFor(() => expect(first).toHaveBeenCalledOnce())
  await user.click(screen.getByRole('button', { name: 'Next' }))
  await vi.waitFor(() => expect(second).toHaveBeenCalledOnce())
  expect(screen.getByLabelText('Actor user ID')).toHaveProperty('value', 'ada')
})
it('rejects malformed URL dates without mounting a history request', async () => {
  const called = vi.fn(() => ({ data: { adminActivity: { total: 0, items: [] } } }))
  renderWithTooltip(
    <MockedProvider
      mocks={[{ request: { query: AdminActivityDocument, variables: () => true }, result: called }]}
    >
      <MemoryRouter initialEntries={['/admin/activity?from=2026-02-30']}>
        <ActivityPage />
      </MemoryRouter>
    </MockedProvider>,
  )
  expect(screen.getByText('Enter a valid From date.')).toBeTruthy()
  expect(screen.queryByRole('status')).toBeNull()
  expect(called).not.toHaveBeenCalled()
})
it('rejects malformed book IDs and unsafe return locations before requesting history', () => {
  renderWithTooltip(
    <MockedProvider>
      <MemoryRouter initialEntries={['/admin/books/invalid/history?returnTo=https://evil.invalid']}>
        <Routes>
          <Route path="/admin/books/:id/history" element={<BookHistoryPage />} />
        </Routes>
      </MemoryRouter>
    </MockedProvider>,
  )
  expect(screen.getByText('Enter a valid book ID.')).toBeTruthy()
  expect(screen.getByRole('link', { name: 'Back to books' }).getAttribute('href')).toBe(
    '/admin/books',
  )
})

function renderWithTooltip(ui: Parameters<typeof render>[0]) {
  return render(<TooltipProvider>{ui}</TooltipProvider>)
}
