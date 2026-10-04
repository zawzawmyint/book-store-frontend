// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MockedProvider } from '@apollo/client/testing/react'
import App from '../../app/App'
import { ViewerDocument } from '../../generated/graphql'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AdminAccessProvider } from './AdminAccessProvider'
import { AccessContext } from './admin-access'
import { RequireAdmin } from './RequireAdmin'
import userEvent from '@testing-library/user-event'

const auth = vi.hoisted(() => ({ hydrateSession: vi.fn(), refetch: vi.fn(async () => {}) }))
vi.mock('../../lib/auth-client', () => ({
  authClient: {
    hydrateSession: auth.hydrateSession,
    useSession: () => ({
      data: { user: { id: 'customer', name: 'Reader', email: 'reader@example.com' } },
      isPending: false,
      refetch: auth.refetch,
    }),
  },
}))
afterEach(cleanup)
it('shows access denied for a signed-in customer on an admin route', async () => {
  window.history.replaceState({}, '', '/admin/books')
  render(
    <MockedProvider
      mocks={[
        {
          request: { query: ViewerDocument },
          result: { data: { viewer: { id: 'customer', role: 'CUSTOMER' } } },
        },
      ]}
    >
      <App />
    </MockedProvider>,
  )
  expect(await screen.findByText('Access denied')).toBeTruthy()
  expect(screen.queryByText('Manage books')).toBeNull()
})

it('does not mount a customer detail page for a signed-in customer', async () => {
  window.history.replaceState({}, '', '/admin/customers/ada')
  render(
    <MockedProvider
      mocks={[
        {
          request: { query: ViewerDocument },
          result: { data: { viewer: { id: 'customer', role: 'CUSTOMER' } } },
        },
      ]}
    >
      <App />
    </MockedProvider>,
  )
  expect(await screen.findByText('Access denied')).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Set password' })).toBeNull()
  expect(screen.queryByLabelText('New password')).toBeNull()
})

it('does not mount the admin profile for a signed-in customer', async () => {
  window.history.replaceState({}, '', '/admin/profile')
  render(
    <MockedProvider
      mocks={[
        {
          request: { query: ViewerDocument },
          result: { data: { viewer: { id: 'customer', role: 'CUSTOMER' } } },
        },
      ]}
    >
      <App />
    </MockedProvider>,
  )
  expect(await screen.findByText('Access denied')).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Save name' })).toBeNull()
  expect(screen.queryByLabelText('Full name')).toBeNull()
})

it('does not mount the customer directory for a signed-in customer', async () => {
  window.history.replaceState({}, '', '/admin/customers')
  render(
    <MockedProvider
      mocks={[
        {
          request: { query: ViewerDocument },
          result: { data: { viewer: { id: 'customer', role: 'CUSTOMER' } } },
        },
      ]}
    >
      <App />
    </MockedProvider>,
  )
  expect(await screen.findByText('Access denied')).toBeTruthy()
  expect(screen.queryByText('Registered accounts. Grant or revoke admin access from this page.')).toBeNull()
})

it('preserves unsaved input during same-account access revalidation and hides it on revocation', async () => {
  const access = {
    role: 'ADMIN',
    loading: false,
    error: undefined,
    expired: false,
    retry: () => {},
    handleError: () => {},
  }
  const view = () => (
    <MockedProvider>
      <AccessContext.Provider value={access}>
        <MemoryRouter initialEntries={['/admin']}>
          <Routes>
            <Route element={<RequireAdmin />}>
              <Route
                path="/admin"
                element={<input aria-label="Draft book title" defaultValue="Draft" />}
              />
            </Route>
          </Routes>
        </MemoryRouter>
      </AccessContext.Provider>
    </MockedProvider>
  )
  const { rerender } = render(view())
  await userEvent.setup().type(screen.getByLabelText('Draft book title'), ' changed')
  access.loading = true
  rerender(view())
  expect(screen.getByLabelText('Draft book title')).toHaveProperty('value', 'Draft changed')
  access.loading = false
  access.role = 'CUSTOMER'
  rerender(view())
  expect(screen.queryByLabelText('Draft book title')).toBeNull()
  expect(screen.getByText('Access denied')).toBeTruthy()
})

it('clears stale auth state when the server reports an expired session', async () => {
  auth.refetch.mockClear()
  window.history.replaceState({}, '', '/admin/orders')
  render(
    <MockedProvider
      mocks={[{ request: { query: ViewerDocument }, result: { data: { viewer: null } } }]}
    >
      <MemoryRouter>
        <AdminAccessProvider>
          <p>Test content</p>
        </AdminAccessProvider>
      </MemoryRouter>
    </MockedProvider>,
  )
  await vi.waitFor(() =>
    expect(auth.refetch).toHaveBeenCalledWith({ query: { disableCookieCache: true } }),
  )
})
