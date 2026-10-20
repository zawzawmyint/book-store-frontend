// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MockedProvider } from '@apollo/client/testing/react'
import { MemoryRouter } from 'react-router-dom'
import { AdminBooksDocument } from '../../../generated/graphql'
import { TooltipProvider } from '../../../app/components/ui/tooltip'
import { AccessContext } from '../admin-access'
import { BooksPage } from './BooksPage'

afterEach(cleanup)
Object.defineProperty(globalThis, 'ResizeObserver', {
  configurable: true,
  value: class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
})
function mount(role: 'STAFF' | 'ADMIN') {
  const book = {
    __typename: 'AdminBook',
    id: '1',
    title: 'Quiet Book',
    author: 'Author',
    genre: 'Fiction',
    description: '',
    priceCents: 1000,
    stock: 3,
    archived: false,
    cover: null,
    coverRevision: 0,
  }
  return render(
    <TooltipProvider>
      <MockedProvider
        mocks={[
          {
            request: {
              query: AdminBooksDocument,
              variables: { search: '', filter: 'ACTIVE', lowStockOnly: false, limit: 5, offset: 0 },
            },
            result: { data: { adminBooks: { total: 1, items: [book] } } },
          },
        ]}
      >
        <AccessContext.Provider
          value={{
            role,
            loading: false,
            error: undefined,
            expired: false,
            retry: () => {},
            handleError: () => {},
            confirmRole: async () => {},
          }}
        >
          <MemoryRouter initialEntries={['/admin/books']}>
            <BooksPage />
          </MemoryRouter>
        </AccessContext.Provider>
      </MockedProvider>
    </TooltipProvider>,
  )
}
it('preserves staff row actions and badges when optional book columns change', async () => {
  const user = userEvent.setup()
  mount('STAFF')
  await screen.findByRole('link', { name: 'Edit Quiet Book' })
  expect(screen.getByText('Low stock')).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'More actions for Quiet Book' })).toBeNull()
  await user.click(screen.getByRole('button', { name: 'Columns' }))
  expect(screen.queryByRole('menuitemcheckbox', { name: 'Book' })).toBeNull()
  expect(screen.queryByRole('menuitemcheckbox', { name: 'Actions' })).toBeNull()
  await user.click(screen.getByRole('menuitemcheckbox', { name: 'Genre' }))
  await user.keyboard('{Escape}')
  expect(screen.queryByRole('columnheader', { name: 'Genre' })).toBeNull()
  expect(screen.getByRole('link', { name: 'Edit Quiet Book' })).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Adjust stock' })).toBeTruthy()
})
it('opens admin archive confirmation from the row menu and restores focus on Cancel', async () => {
  const user = userEvent.setup()
  mount('ADMIN')
  const opener = await screen.findByRole('button', { name: 'More actions for Quiet Book' })
  await user.click(opener)
  await user.click(screen.getByRole('menuitem', { name: 'Archive' }))
  expect(screen.getByRole('alertdialog', { name: 'Archive Quiet Book?' })).toBeTruthy()
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cancel' }))
  await user.click(screen.getByRole('button', { name: 'Cancel' }))
  await waitFor(() => expect(document.activeElement).toBe(opener))
})
