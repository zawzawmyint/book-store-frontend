// @vitest-environment jsdom
import { TooltipProvider } from '../../../app/components/ui/tooltip'
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MockedProvider } from '@apollo/client/testing/react'
import { GraphQLError } from 'graphql'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AdminUserDocument, ResetUserPasswordDocument } from '../../../generated/graphql'
import { AccessContext } from '../admin-access'
import { UserPage } from './UserPage'

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
  __typename: 'AdminUser' as const,
  id: 'ada',
  name: 'Ada Reader',
  email: 'ada@example.com',
  role: 'CUSTOMER' as const,
  createdAt: '2026-01-02T00:00:00.000Z',
}
function renderPage(entry: string | { pathname: string; state?: unknown }, mocks: unknown[]) {
  return renderWithTooltip(
    <MockedProvider mocks={mocks as never}>
      <AccessContext.Provider value={access}>
        <MemoryRouter initialEntries={[entry as never]}>
          <Routes>
            <Route path="/admin/users/:id" element={<UserPage />} />
            <Route path="/admin/users" element={<p>User list</p>} />
            <Route path="/admin/profile" element={<p>Profile page</p>} />
          </Routes>
        </MemoryRouter>
      </AccessContext.Provider>
    </MockedProvider>,
  )
}
function userMock(
  user: {
    [Key in keyof typeof ada]: Key extends 'role' ? 'ADMIN' | 'CUSTOMER' : (typeof ada)[Key]
  } = ada,
) {
  return {
    request: { query: AdminUserDocument, variables: { id: user.id } },
    result: { data: { adminUser: user } },
    maxUsageCount: 5,
  }
}

it.each([
  [
    '/admin/customers?search=Ada&role=CUSTOMER&page=2',
    '/admin/users?search=Ada&role=CUSTOMER&page=2',
  ],
  ['https://example.com/admin/users?search=Ada', '/admin/users'],
  ['//example.com/admin/users?search=Ada', '/admin/users'],
  ['/admin/users-other?search=Ada', '/admin/users'],
])('normalizes or rejects return state %s', async (returnTo, expected) => {
  renderPage({ pathname: '/admin/users/ada', state: { returnTo } }, [userMock()])
  await screen.findByRole('heading', { name: 'Ada Reader' })
  expect(screen.getByRole('link', { name: 'Back to users' }).getAttribute('href')).toBe(expected)
})

it('shows another account and rejects a short or mismatched password before saving', async () => {
  const user = userEvent.setup()
  renderPage(
    {
      pathname: '/admin/users/ada',
      state: { returnTo: '/admin/users?search=Ada&role=CUSTOMER&page=2' },
    },
    [userMock()],
  )
  expect(await screen.findByRole('heading', { name: 'Ada Reader' })).toBeTruthy()
  expect(screen.getByText('ada@example.com')).toBeTruthy()
  expect(screen.getByText('Customer')).toBeTruthy()
  expect(screen.getByText(new Date(ada.createdAt).toLocaleDateString())).toBeTruthy()
  expect(screen.getByRole('link', { name: 'Back to users' }).getAttribute('href')).toBe(
    '/admin/users?search=Ada&role=CUSTOMER&page=2',
  )
  await user.type(screen.getByLabelText('New password'), 'short')
  await user.type(screen.getByLabelText('Confirm new password'), 'short')
  await user.click(screen.getByRole('button', { name: 'Set password' }))
  expect(await screen.findByText('Use at least 8 characters.')).toBeTruthy()
  await user.clear(screen.getByLabelText('New password'))
  await user.type(screen.getByLabelText('New password'), 'new-password-123')
  await user.click(screen.getByRole('button', { name: 'Set password' }))
  expect(await screen.findByText('Enter the same password again.')).toBeTruthy()
  expect(screen.getByLabelText('New password')).toHaveProperty('value', 'new-password-123')
})

it('sets a password, announces success, and clears the fields', async () => {
  const user = userEvent.setup()
  renderPage('/admin/users/ada', [
    userMock(),
    {
      request: {
        query: ResetUserPasswordDocument,
        variables: { userId: 'ada', newPassword: 'new-password-123' },
      },
      result: { data: { resetUserPassword: ada } },
    },
  ])
  await screen.findByRole('heading', { name: 'Ada Reader' })
  await user.type(screen.getByLabelText('New password'), 'new-password-123')
  await user.type(screen.getByLabelText('Confirm new password'), 'new-password-123')
  await user.click(screen.getByRole('button', { name: 'Set password' }))
  expect(await screen.findByText('Password set.')).toBeTruthy()
  expect(screen.getByLabelText('New password')).toHaveProperty('value', '')
  expect(screen.getByLabelText('Confirm new password')).toHaveProperty('value', '')
  expect(screen.getByRole('heading', { name: 'Ada Reader' })).toBeTruthy()
})

it('keeps the password fields when the reset is rejected', async () => {
  const user = userEvent.setup()
  renderPage('/admin/users/ada', [
    userMock(),
    {
      request: {
        query: ResetUserPasswordDocument,
        variables: { userId: 'ada', newPassword: 'new-password-123' },
      },
      result: {
        errors: [
          new GraphQLError('User was not found', { extensions: { code: 'BAD_USER_INPUT' } }),
        ],
      },
    },
  ])
  await screen.findByRole('heading', { name: 'Ada Reader' })
  await user.type(screen.getByLabelText('New password'), 'new-password-123')
  await user.type(screen.getByLabelText('Confirm new password'), 'new-password-123')
  await user.click(screen.getByRole('button', { name: 'Set password' }))
  expect((await screen.findByRole('alert')).textContent).toContain('User was not found')
  expect(screen.getByLabelText('New password')).toHaveProperty('value', 'new-password-123')
  expect(screen.getByLabelText('Confirm new password')).toHaveProperty('value', 'new-password-123')
})

it('shows the signed-in admin their details without a password form', async () => {
  session.id = 'ada'
  renderPage('/admin/users/ada', [userMock({ ...ada, role: 'ADMIN', email: 'admin@example.com' })])
  expect(await screen.findByRole('heading', { name: 'Ada Reader' })).toBeTruthy()
  expect(screen.getByText('Admin')).toBeTruthy()
  expect(screen.queryByLabelText('New password')).toBeNull()
  expect(screen.getByRole('link', { name: 'your profile' }).getAttribute('href')).toBe(
    '/admin/profile',
  )
})

it('shows an unknown account message and no password form', async () => {
  renderPage('/admin/users/missing', [
    {
      request: { query: AdminUserDocument, variables: { id: 'missing' } },
      result: {
        errors: [
          new GraphQLError('User was not found', { extensions: { code: 'BAD_USER_INPUT' } }),
        ],
      },
    },
  ])
  expect((await screen.findByRole('alert')).textContent).toContain('User was not found')
  expect(screen.queryByLabelText('New password')).toBeNull()
  expect(screen.queryByRole('button', { name: 'Set password' })).toBeNull()
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
