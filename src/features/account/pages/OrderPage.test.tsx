import { GraphQLError } from 'graphql'
// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MockedProvider } from '@apollo/client/testing/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { MyOrderDocument } from '../../../generated/graphql'
import { OrderPage } from './OrderPage'
const auth = vi.hoisted(() => ({ refresh: vi.fn(async () => {}) }))
vi.mock('../../../lib/auth-client', () => ({
  authClient: { useSession: () => ({ refetch: auth.refresh }) },
}))
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})
function mount(id: string, order: unknown) {
  return render(
    <MockedProvider
      mocks={[
        {
          request: { query: MyOrderDocument, variables: { id } },
          result: { data: { myOrder: order } },
        },
      ]}
    >
      <MemoryRouter initialEntries={[`/account/orders/${id}`]}>
        <Routes>
          <Route path="/account/orders/:id" element={<OrderPage />} />
        </Routes>
      </MemoryRouter>
    </MockedProvider>,
  )
}
it('shows customer-safe progress and renders cancellation reason as text', async () => {
  const { container } = mount('1', {
    id: '1',
    status: 'CANCELLED',
    createdAt: '2026-10-07T00:00:00Z',
    totalCents: 1200,
    items: [{ title: 'Saved title', quantity: 1, unitPriceCents: 1200 }],
    history: [
      {
        id: '1',
        fromStatus: null,
        toStatus: 'SUBMITTED',
        createdAt: '2026-10-07T00:00:00Z',
        cancellationReason: null,
      },
      {
        id: '2',
        fromStatus: 'SUBMITTED',
        toStatus: 'CANCELLED',
        createdAt: '2026-10-07T01:00:00Z',
        cancellationReason: '<script>alert(1)</script>',
        actorName: 'Private staff',
        actorRole: 'STAFF',
      },
    ],
  })
  expect(await screen.findByText('Reason: <script>alert(1)</script>')).toBeTruthy()
  expect(container.querySelector('script')).toBeNull()
  expect(screen.queryByText('Private staff')).toBeNull()
  expect(screen.queryByText(/Recorded role/)).toBeNull()
  expect(screen.queryByRole('button', { name: 'Cancel request' })).toBeNull()
  expect(screen.getByRole('link', { name: 'Back to your orders' }).getAttribute('href')).toBe(
    '/account/orders',
  )
})
it.each(['1', 'bad', '0'])(
  'uses the same not-found state for missing or invalid request %s',
  async (id) => {
    mount(id, null)
    expect(await screen.findByRole('heading', { name: 'Order request not found' })).toBeTruthy()
  },
)

it('interprets persisted SQLite submission dates as UTC like timeline events', async () => {
  mount('1', {
    id: '1',
    status: 'SUBMITTED',
    createdAt: '2026-10-07 06:20:00',
    totalCents: 0,
    items: [],
    history: [],
  })
  expect(await screen.findByText(new Date('2026-10-07T06:20:00Z').toLocaleString())).toBeTruthy()
})

it('refreshes an expired session and keeps the intended detail login URL', async () => {
  render(
    <MockedProvider
      mocks={[
        {
          request: { query: MyOrderDocument, variables: { id: '1' } },
          result: {
            errors: [new GraphQLError('Expired', { extensions: { code: 'UNAUTHENTICATED' } })],
          },
        },
      ]}
    >
      <MemoryRouter initialEntries={['/account/orders/1']}>
        <Routes>
          <Route path="/account/orders/:id" element={<OrderPage />} />
          <Route path="/sign-in" element={<p>Sign in again</p>} />
        </Routes>
      </MemoryRouter>
    </MockedProvider>,
  )
  await screen.findByText('Sign in again')
  expect(auth.refresh).toHaveBeenCalledWith({ query: { disableCookieCache: true } })
})
