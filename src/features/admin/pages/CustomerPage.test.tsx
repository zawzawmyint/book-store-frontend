// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MockedProvider } from '@apollo/client/testing/react'
import { GraphQLError } from 'graphql'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AdminCustomerDocument, ResetCustomerPasswordDocument } from '../../../generated/graphql'
import { AccessContext } from '../admin-access'
import { CustomerPage } from './CustomerPage'

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
}
const ada = {
  __typename: 'AdminCustomer' as const,
  id: 'ada',
  name: 'Ada Reader',
  email: 'ada@example.com',
  role: 'CUSTOMER' as const,
  createdAt: '2026-01-02T00:00:00.000Z',
}
function renderPage(entry: string | { pathname: string; state?: unknown }, mocks: unknown[]) {
  return render(
    <MockedProvider mocks={mocks as never}>
      <AccessContext.Provider value={access}>
        <MemoryRouter initialEntries={[entry as never]}>
          <Routes>
            <Route path="/admin/customers/:id" element={<CustomerPage />} />
            <Route path="/admin/customers" element={<p>Customer list</p>} />
            <Route path="/admin/profile" element={<p>Profile page</p>} />
          </Routes>
        </MemoryRouter>
      </AccessContext.Provider>
    </MockedProvider>,
  )
}
function customerMock(customer: { [Key in keyof typeof ada]: Key extends 'role' ? 'ADMIN' | 'CUSTOMER' : (typeof ada)[Key] } = ada) {
  return {
    request: { query: AdminCustomerDocument, variables: { id: customer.id } },
    result: { data: { adminCustomer: customer } },
    maxUsageCount: 5,
  }
}

it('shows another account and rejects a short or mismatched password before saving', async () => {
  const user = userEvent.setup()
  renderPage(
    {
      pathname: '/admin/customers/ada',
      state: { returnTo: '/admin/customers?search=Ada&role=CUSTOMER&page=2' },
    },
    [customerMock()],
  )
  expect(await screen.findByRole('heading', { name: 'Ada Reader' })).toBeTruthy()
  expect(screen.getByText('ada@example.com')).toBeTruthy()
  expect(screen.getByText('Customer')).toBeTruthy()
  expect(screen.getByText(new Date(ada.createdAt).toLocaleDateString())).toBeTruthy()
  expect(screen.getByRole('link', { name: 'Back to customers' }).getAttribute('href')).toBe(
    '/admin/customers?search=Ada&role=CUSTOMER&page=2',
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
  renderPage('/admin/customers/ada', [
    customerMock(),
    {
      request: {
        query: ResetCustomerPasswordDocument,
        variables: { userId: 'ada', newPassword: 'new-password-123' },
      },
      result: { data: { resetCustomerPassword: ada } },
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
  renderPage('/admin/customers/ada', [
    customerMock(),
    {
      request: {
        query: ResetCustomerPasswordDocument,
        variables: { userId: 'ada', newPassword: 'new-password-123' },
      },
      result: {
        errors: [new GraphQLError('User was not found', { extensions: { code: 'BAD_USER_INPUT' } })],
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
  renderPage('/admin/customers/ada', [customerMock({ ...ada, role: 'ADMIN', email: 'admin@example.com' })])
  expect(await screen.findByRole('heading', { name: 'Ada Reader' })).toBeTruthy()
  expect(screen.getByText('Admin')).toBeTruthy()
  expect(screen.queryByLabelText('New password')).toBeNull()
  expect(screen.getByRole('link', { name: 'your profile' }).getAttribute('href')).toBe('/admin/profile')
})

it('shows an unknown account message and no password form', async () => {
  renderPage('/admin/customers/missing', [
    {
      request: { query: AdminCustomerDocument, variables: { id: 'missing' } },
      result: {
        errors: [new GraphQLError('User was not found', { extensions: { code: 'BAD_USER_INPUT' } })],
      },
    },
  ])
  expect((await screen.findByRole('alert')).textContent).toContain('User was not found')
  expect(screen.queryByLabelText('New password')).toBeNull()
  expect(screen.queryByRole('button', { name: 'Set password' })).toBeNull()
})
