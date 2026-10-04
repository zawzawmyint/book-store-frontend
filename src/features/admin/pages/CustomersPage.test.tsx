// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MockedProvider } from '@apollo/client/testing/react'
import { GraphQLError } from 'graphql'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AdminCustomersDocument, SetCustomerAdminAccessDocument } from '../../../generated/graphql'
import { AccessContext } from '../admin-access'
import { CustomersPage } from './CustomersPage'

const session = vi.hoisted(() => ({ id: 'admin-1' }))
vi.mock('../../../lib/auth-client', () => ({
  authClient: {
    useSession: () => ({
      data: { user: { id: session.id, name: 'Admin', email: 'admin@example.com' } },
      isPending: false,
    }),
  },
}))
afterEach(() => {
  cleanup()
  session.id = 'admin-1'
})
Object.defineProperty(HTMLDialogElement.prototype, 'close', {
  configurable: true,
  value() {
    this.removeAttribute('open')
  },
})
Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
  configurable: true,
  value() {
    this.setAttribute('open', '')
  },
})
const access = {
  role: 'ADMIN' as const,
  loading: false,
  error: undefined,
  expired: false,
  retry: () => {},
  handleError: () => {},
}
const ada = {
  id: 'ada',
  name: 'Ada Reader',
  email: 'ada@example.com',
  role: 'CUSTOMER' as 'ADMIN' | 'CUSTOMER',
  createdAt: '2026-01-02T00:00:00.000Z',
}
function list(variables: Record<string, unknown>, items = [ada], total = items.length) {
  return {
    request: { query: AdminCustomersDocument, variables },
    result: { data: { adminCustomers: { total, items } } },
    maxUsageCount: 5,
  }
}
const firstPage = { search: '', role: 'ALL', limit: 5, offset: 0 }
function renderPage(entry: string, mocks: unknown[]) {
  return render(
    <MockedProvider mocks={mocks as never}>
      <AccessContext.Provider value={access}>
        <MemoryRouter initialEntries={[entry]}>
          <Routes>
            <Route path="/admin/customers" element={<CustomersPage />} />
          </Routes>
        </MemoryRouter>
      </AccessContext.Provider>
    </MockedProvider>,
  )
}

it('reads search, role, and page from the URL and shows an empty directory', async () => {
  renderPage('/admin/customers?search=Ada&role=NOPE&page=2', [
    list({ search: 'Ada', role: 'ALL', limit: 5, offset: 5 }, [], 0),
  ])
  expect(await screen.findByText('No accounts match.')).toBeTruthy()
  expect(screen.getByLabelText('Search customers')).toHaveProperty('value', 'Ada')
})

it('shows the matching account and announces copy success or failure', async () => {
  const user = userEvent.setup()
  const writeText = vi.fn()
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
  renderPage('/admin/customers', [list(firstPage)])
  expect(await screen.findByText('Ada Reader')).toBeTruthy()
  expect(screen.getByRole('link', { name: 'View customer' }).getAttribute('href')).toBe(
    '/admin/customers/ada',
  )
  expect(screen.getByText('Customer')).toBeTruthy()
  expect(screen.getByText(new Date(ada.createdAt).toLocaleDateString())).toBeTruthy()
  writeText.mockResolvedValueOnce(undefined)
  await user.click(screen.getByRole('button', { name: 'Copy user ID' }))
  expect(writeText).toHaveBeenCalledWith('ada')
  expect(await screen.findByText('User ID copied.')).toBeTruthy()
  writeText.mockRejectedValueOnce(new Error('denied'))
  await user.click(screen.getByRole('button', { name: 'Copy user ID' }))
  expect((await screen.findByRole('alert')).textContent).toContain('Unable to copy the user ID.')
  expect(screen.getByText('ada')).toBeTruthy()
})

it('requires confirmation before granting admin and keeps the dialog on a rejected change', async () => {
  const user = userEvent.setup()
  renderPage('/admin/customers', [
    list(firstPage),
    {
      request: { query: SetCustomerAdminAccessDocument, variables: { userId: 'ada', enabled: true } },
      result: { errors: [new GraphQLError('User was not found', { extensions: { code: 'BAD_USER_INPUT' } })] },
    },
    {
      request: { query: SetCustomerAdminAccessDocument, variables: { userId: 'ada', enabled: true } },
      result: {
        data: { setCustomerAdminAccess: { __typename: 'AdminCustomer', ...ada, role: 'ADMIN' } },
      },
    },
  ])
  await screen.findByText('Ada Reader')
  await user.click(screen.getByRole('button', { name: 'Grant admin' }))
  expect(screen.getByText(/open the admin workspace/)).toBeTruthy()
  await user.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(screen.queryByText(/open the admin workspace/)).toBeNull()
  expect(screen.getByRole('button', { name: 'Grant admin' })).toHaveProperty('ownerDocument')
  await user.click(screen.getByRole('button', { name: 'Grant admin' }))
  await user.click(screen.getByRole('button', { name: 'Confirm grant' }))
  expect((await screen.findByRole('alert')).textContent).toContain('User was not found')
  expect(screen.getByRole('button', { name: 'Confirm grant' })).toBeTruthy()
  await user.click(screen.getByRole('button', { name: 'Confirm grant' }))
  expect(await screen.findByText('Ada Reader is now an admin.')).toBeTruthy()
})

it('warns before revoking the signed-in admin and does not confirm a lost response automatically', async () => {
  const user = userEvent.setup()
  session.id = 'ada'
  renderPage('/admin/customers', [
    list(firstPage, [{ ...ada, role: 'ADMIN' }]),
    {
      request: {
        query: SetCustomerAdminAccessDocument,
        variables: { userId: 'ada', enabled: false },
      },
      error: new Error('Connection lost'),
    },
    list(firstPage, [{ ...ada, role: 'ADMIN' }]),
  ])
  await screen.findByText('Admin')
  await user.click(screen.getByRole('button', { name: 'Revoke admin' }))
  expect(screen.getByText('This will remove your own admin access.')).toBeTruthy()
  await user.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(screen.queryByText('This will remove your own admin access.')).toBeNull()
  await user.click(screen.getByRole('button', { name: 'Revoke admin' }))
  await user.click(screen.getByRole('button', { name: 'Confirm revoke' }))
  expect(await screen.findByText(/The result is unknown/)).toBeTruthy()
  expect((screen.getByRole('button', { name: 'Confirm revoke' }) as HTMLButtonElement).disabled).toBe(
    true,
  )
  await user.click(screen.getByRole('button', { name: 'Refresh customer list' }))
  expect(await screen.findByText(/does not confirm whether the earlier change ran/)).toBeTruthy()
  expect((screen.getByRole('button', { name: 'Confirm revoke' }) as HTMLButtonElement).disabled).toBe(
    false,
  )
})

it('shows a retryable directory error', async () => {
  renderPage('/admin/customers', [
    {
      request: { query: AdminCustomersDocument, variables: firstPage },
      error: new Error('Unable to load customers'),
    },
  ])
  expect((await screen.findByRole('alert')).textContent).toContain('Unable to load customers')
  expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy()
  expect(screen.queryByText('Ada Reader')).toBeNull()
})
