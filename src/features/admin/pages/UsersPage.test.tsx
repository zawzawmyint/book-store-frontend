// @vitest-environment jsdom
import { TooltipProvider } from '../../../app/components/ui/tooltip'
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MockedProvider } from '@apollo/client/testing/react'
import { GraphQLError } from 'graphql'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AdminUsersDocument, SetUserRoleDocument } from '../../../generated/graphql'
import { AccessContext } from '../admin-access'
import { UsersPage } from './UsersPage'

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
  confirmRole: async () => {},
}
const ada = {
  id: 'ada',
  name: 'Ada Reader',
  email: 'ada@example.com',
  role: 'CUSTOMER' as 'ADMIN' | 'STAFF' | 'CUSTOMER',
  createdAt: '2026-01-02T00:00:00.000Z',
}
function list(variables: Record<string, unknown>, items = [ada], total = items.length) {
  return {
    request: { query: AdminUsersDocument, variables },
    result: { data: { adminUsers: { total, items } } },
    maxUsageCount: 5,
  }
}
const firstPage = { search: '', role: 'ALL', limit: 5, offset: 0 }

it('offers role selection instead of grant or revoke controls', async () => {
  renderPage('/admin/users', [list(firstPage)])
  expect(await screen.findByRole('button', { name: 'Change role' })).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Grant admin' })).toBeNull()
})

it('assigns staff explicitly and prevents saving an unchanged role', async () => {
  const user = userEvent.setup()
  renderPage('/admin/users', [
    list(firstPage),
    {
      request: { query: SetUserRoleDocument, variables: { userId: 'ada', role: 'STAFF' } },
      result: { data: { setUserRole: { __typename: 'AdminUser', ...ada, role: 'STAFF' } } },
    },
  ])
  await user.click(await screen.findByRole('button', { name: 'Change role' }))
  expect(screen.getByRole('button', { name: 'Confirm role change' })).toHaveProperty(
    'disabled',
    true,
  )
  await user.selectOptions(screen.getByLabelText('New role'), 'STAFF')
  expect(screen.getByText(/User management and archive\/restore remain admin-only/)).toBeTruthy()
  await user.click(screen.getByRole('button', { name: 'Confirm role change' }))
  expect(await screen.findByText('Ada Reader is now a staff member.')).toBeTruthy()
})
function renderPage(entry: string, mocks: unknown[]) {
  return renderWithTooltip(
    <MockedProvider mocks={mocks as never}>
      <AccessContext.Provider value={access}>
        <MemoryRouter initialEntries={[entry]}>
          <Routes>
            <Route path="/admin/users" element={<UsersPage />} />
          </Routes>
        </MemoryRouter>
      </AccessContext.Provider>
    </MockedProvider>,
  )
}

it('reads search, role, and page from the URL and shows an empty directory', async () => {
  renderPage('/admin/users?search=Ada&role=NOPE&page=2', [
    list({ search: 'Ada', role: 'ALL', limit: 5, offset: 5 }, [], 0),
  ])
  expect(await screen.findByText('No accounts match.')).toBeTruthy()
  expect(screen.getByLabelText('Search users')).toHaveProperty('value', 'Ada')
})

it('shows the matching account and announces copy success or failure', async () => {
  const user = userEvent.setup()
  const writeText = vi.fn()
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
  renderPage('/admin/users', [list(firstPage)])
  expect(await screen.findByText('Ada Reader')).toBeTruthy()
  expect(screen.getByRole('link', { name: 'View user Ada Reader' }).getAttribute('href')).toBe(
    '/admin/users/ada',
  )
  expect(screen.getByText('Customer')).toBeTruthy()
  expect(screen.getByText(new Date(ada.createdAt).toLocaleDateString())).toBeTruthy()
  writeText.mockResolvedValueOnce(undefined)
  await user.click(screen.getByRole('button', { name: 'Copy user ID for Ada Reader' }))
  expect(writeText).toHaveBeenCalledWith('ada')
  expect(await screen.findByText('User ID copied.')).toBeTruthy()
  writeText.mockRejectedValueOnce(new Error('denied'))
  await user.click(screen.getByRole('button', { name: 'Copy user ID for Ada Reader' }))
  expect((await screen.findByRole('alert')).textContent).toContain('Unable to copy the user ID.')
  expect(screen.getByText('ada')).toBeTruthy()
})

it('requires confirmation before granting admin and keeps the dialog on a rejected change', async () => {
  const user = userEvent.setup()
  renderPage('/admin/users', [
    list(firstPage),
    {
      request: { query: SetUserRoleDocument, variables: { userId: 'ada', role: 'ADMIN' } },
      result: {
        errors: [
          new GraphQLError('User was not found', { extensions: { code: 'BAD_USER_INPUT' } }),
        ],
      },
    },
    {
      request: { query: SetUserRoleDocument, variables: { userId: 'ada', role: 'ADMIN' } },
      result: {
        data: { setUserRole: { __typename: 'AdminUser', ...ada, role: 'ADMIN' } },
      },
    },
  ])
  await screen.findByText('Ada Reader')
  await user.click(screen.getByRole('button', { name: 'Change role' }))
  await user.selectOptions(screen.getByLabelText('New role'), 'ADMIN')
  expect(screen.getByText(/open the admin workspace/)).toBeTruthy()
  await user.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(screen.queryByText(/open the admin workspace/)).toBeNull()
  expect(screen.getByRole('button', { name: 'Change role' })).toHaveProperty('ownerDocument')
  await user.click(screen.getByRole('button', { name: 'Change role' }))
  await user.selectOptions(screen.getByLabelText('New role'), 'ADMIN')
  await user.click(screen.getByRole('button', { name: 'Confirm role change' }))
  expect((await screen.findByRole('alert')).textContent).toContain('User was not found')
  expect(screen.getByRole('button', { name: 'Confirm role change' })).toBeTruthy()
  await user.click(screen.getByRole('button', { name: 'Confirm role change' }))
  expect(await screen.findByText('Ada Reader is now an admin.')).toBeTruthy()
})

it('warns before revoking the signed-in admin and does not confirm a lost response automatically', async () => {
  const user = userEvent.setup()
  session.id = 'ada'
  renderPage('/admin/users', [
    list(firstPage, [{ ...ada, role: 'ADMIN' }]),
    {
      request: {
        query: SetUserRoleDocument,
        variables: { userId: 'ada', role: 'CUSTOMER' },
      },
      error: new Error('Connection lost'),
    },
    list(firstPage, [{ ...ada, role: 'ADMIN' }]),
  ])
  await screen.findByText('Admin')
  await user.click(screen.getByRole('button', { name: 'Change role' }))
  await user.selectOptions(screen.getByLabelText('New role'), 'CUSTOMER')
  expect(screen.getByText(/This will remove your own admin access/)).toBeTruthy()
  await user.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(screen.queryByText(/This will remove your own admin access/)).toBeNull()
  await user.click(screen.getByRole('button', { name: 'Change role' }))
  await user.selectOptions(screen.getByLabelText('New role'), 'CUSTOMER')
  await user.click(screen.getByRole('button', { name: 'Confirm role change' }))
  expect(await screen.findByText(/The result is unknown/)).toBeTruthy()
  expect(
    (screen.getByRole('button', { name: 'Confirm role change' }) as HTMLButtonElement).disabled,
  ).toBe(true)
  await user.click(screen.getByRole('button', { name: 'Refresh user list' }))
  expect(await screen.findByText(/does not confirm whether the earlier change ran/)).toBeTruthy()
  expect(
    (screen.getByRole('button', { name: 'Confirm role change' }) as HTMLButtonElement).disabled,
  ).toBe(false)
})

it('shows a retryable directory error', async () => {
  renderPage('/admin/users', [
    {
      request: { query: AdminUsersDocument, variables: firstPage },
      error: new Error('Unable to load users'),
    },
  ])
  expect((await screen.findByRole('alert')).textContent).toContain('Unable to load users')
  expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy()
  expect(screen.queryByText('Ada Reader')).toBeNull()
})

function renderWithTooltip(ui: Parameters<typeof render>[0]) {
  const result = render(<TooltipProvider>{ui}</TooltipProvider>)
  return {
    ...result,
    rerender: (next: typeof ui) => result.rerender(<TooltipProvider>{next}</TooltipProvider>),
  }
}

Object.defineProperty(globalThis, 'ResizeObserver', {
  configurable: true,
  value: class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
})
