// @vitest-environment jsdom
import { TooltipProvider } from '../../app/components/ui/tooltip'
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MockedProvider } from '@apollo/client/testing/react'
import App from '../../app/App'
import { ViewerDocument } from '../../generated/graphql'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AdminAccessProvider } from './AdminAccessProvider'
import { AccessContext, useAdminAccess } from './admin-access'
import { RequireAdmin } from './RequireAdmin'
import userEvent from '@testing-library/user-event'
import { gql, InMemoryCache } from '@apollo/client'

it('lets staff enter the workspace but rejects user-management routes', async () => {
  const access = {
    role: 'STAFF',
    loading: false,
    error: undefined,
    expired: false,
    retry: () => {},
    handleError: () => {},
    confirmRole: async () => {},
  }
  const view = (adminOnly: boolean) => (
    <MockedProvider>
      <AccessContext.Provider value={access}>
        <MemoryRouter>
          <Routes>
            <Route element={<RequireAdmin adminOnly={adminOnly} />}>
              <Route path="/" element={<p>Permitted workspace</p>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AccessContext.Provider>
    </MockedProvider>
  )
  const { rerender } = renderWithTooltip(view(false))
  expect(screen.getByText('Permitted workspace')).toBeTruthy()
  rerender(view(true))
  expect(screen.getByText('Access denied')).toBeTruthy()
  expect(screen.queryByText('Permitted workspace')).toBeNull()
})

const auth = vi.hoisted(() => ({ hydrateSession: vi.fn(), refetch: vi.fn(async () => {}) }))

function PermissionProbe() {
  const access = useAdminAccess()
  return (
    <>
      <p>Resolved role: {access.role}</p>
      {access.error && <p>{access.error.message}</p>}
      <button onClick={() => void access.confirmRole('STAFF').then(access.retry)}>
        Confirm self-demotion
      </button>
      <button
        onClick={() => access.handleError({ errors: [{ extensions: { code: 'FORBIDDEN' } }] })}
      >
        Denied action
      </button>
    </>
  )
}

it('revalidates a forbidden action without treating staff as customers', async () => {
  renderWithTooltip(
    <MockedProvider
      mocks={[
        {
          request: { query: ViewerDocument },
          result: { data: { viewer: { id: 'customer', role: 'STAFF' } } },
          maxUsageCount: 2,
        },
      ]}
    >
      <MemoryRouter>
        <AdminAccessProvider>
          <PermissionProbe />
        </AdminAccessProvider>
      </MemoryRouter>
    </MockedProvider>,
  )
  await screen.findByText('Resolved role: STAFF')
  await userEvent.setup().click(screen.getByRole('button', { name: 'Denied action' }))
  expect(await screen.findByText('Resolved role: STAFF')).toBeTruthy()
  expect(screen.queryByText('Resolved role: CUSTOMER')).toBeNull()
})
it('clears private data and keeps a confirmed self-demotion when refresh fails', async () => {
  const cache = new InMemoryCache()
  cache.writeFragment({
    id: 'AdminUser:private',
    fragment: gql`
      fragment PrivateUser on AdminUser {
        id
        email
      }
    `,
    data: { __typename: 'AdminUser', id: 'private', email: 'private@example.com' },
  })
  renderWithTooltip(
    <MockedProvider
      cache={cache}
      mocks={[
        {
          request: { query: ViewerDocument },
          result: { data: { viewer: { id: 'customer', role: 'ADMIN' } } },
        },
        { request: { query: ViewerDocument }, error: new Error('Role refresh failed') },
      ]}
    >
      <MemoryRouter>
        <AdminAccessProvider>
          <PermissionProbe />
        </AdminAccessProvider>
      </MemoryRouter>
    </MockedProvider>,
  )
  await screen.findByText('Resolved role: ADMIN')
  await userEvent.setup().click(screen.getByRole('button', { name: 'Confirm self-demotion' }))
  await screen.findByText('Role refresh failed')
  expect(screen.getByText('Resolved role: STAFF')).toBeTruthy()
  expect(cache.extract()['AdminUser:private']).toBeUndefined()
})

it('offers a retry when role revalidation fails after a forbidden action', async () => {
  const viewer = {
    request: { query: ViewerDocument },
    result: { data: { viewer: { id: 'customer', role: 'STAFF' } } },
  }
  renderWithTooltip(
    <MockedProvider
      mocks={[
        viewer,
        { request: { query: ViewerDocument }, error: new Error('Role service unavailable') },
        viewer,
      ]}
    >
      <MemoryRouter>
        <AdminAccessProvider>
          <Routes>
            <Route element={<RequireAdmin />}>
              <Route path="/" element={<PermissionProbe />} />
            </Route>
          </Routes>
        </AdminAccessProvider>
      </MemoryRouter>
    </MockedProvider>,
  )
  const user = userEvent.setup()
  await screen.findByText('Resolved role: STAFF')
  await user.click(screen.getByRole('button', { name: 'Denied action' }))
  expect(await screen.findByText(/Role service unavailable/)).toBeTruthy()
  expect(screen.queryByText('Resolved role: STAFF')).toBeNull()
  await user.click(screen.getByRole('button', { name: 'Retry access check' }))
  expect(await screen.findByText('Resolved role: STAFF')).toBeTruthy()
})

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
it.each(['/admin/activity', '/admin/books/1/history'])(
  'denies staff activity route %s before mounting history',
  async (path) => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }),
    })
    window.history.replaceState({}, '', path)
    renderWithTooltip(
      <MockedProvider
        mocks={[
          {
            request: { query: ViewerDocument },
            result: { data: { viewer: { id: 'customer', role: 'STAFF' } } },
          },
        ]}
      >
        <App />
      </MockedProvider>,
    )
    expect(await screen.findByText('Access denied')).toBeTruthy()
    expect(screen.queryByText('Activity history')).toBeNull()
  },
)
it('shows access denied for a signed-in customer on an admin route', async () => {
  window.history.replaceState({}, '', '/admin/books')
  renderWithTooltip(
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

it('does not mount a user detail page for a signed-in customer', async () => {
  window.history.replaceState({}, '', '/admin/users/ada')
  renderWithTooltip(
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
  renderWithTooltip(
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

it('does not mount the user directory for a signed-in customer', async () => {
  window.history.replaceState({}, '', '/admin/users')
  renderWithTooltip(
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
  expect(
    screen.queryByText('Registered accounts. Grant or revoke admin access from this page.'),
  ).toBeNull()
})

it('preserves unsaved input during same-account access revalidation and hides it on revocation', async () => {
  const access = {
    role: 'ADMIN',
    loading: false,
    error: undefined,
    expired: false,
    retry: () => {},
    handleError: () => {},
    confirmRole: async () => {},
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
  const { rerender } = renderWithTooltip(view())
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
  renderWithTooltip(
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
it('clears private order data when staff access is revoked during revalidation', async () => {
  const cache = new InMemoryCache()
  cache.writeFragment({
    id: 'AdminOrder:private',
    fragment: gql`
      fragment PrivateOrder on AdminOrder {
        id
        email
      }
    `,
    data: { __typename: 'AdminOrder', id: 'private', email: 'reader@example.com' },
  })
  renderWithTooltip(
    <MockedProvider
      cache={cache}
      mocks={[
        {
          request: { query: ViewerDocument },
          result: { data: { viewer: { id: 'customer', role: 'STAFF' } } },
        },
        {
          request: { query: ViewerDocument },
          result: { data: { viewer: { id: 'customer', role: 'CUSTOMER' } } },
        },
      ]}
    >
      <MemoryRouter>
        <AdminAccessProvider>
          <PermissionProbe />
        </AdminAccessProvider>
      </MemoryRouter>
    </MockedProvider>,
  )
  await screen.findByText('Resolved role: STAFF')
  window.dispatchEvent(new Event('focus'))
  await screen.findByText('Resolved role: CUSTOMER')
  expect(cache.extract()['AdminOrder:private']).toBeUndefined()
})
