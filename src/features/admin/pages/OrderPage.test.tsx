import { GraphQLError } from 'graphql'
// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MockedProvider } from '@apollo/client/testing/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AdminOrderDocument, SetOrderStatusDocument } from '../../../generated/graphql'
import { AccessContext } from '../admin-access'
import { OrderPage } from './OrderPage'
afterEach(cleanup)
export const order = {
  id: '1',
  userId: 'customer',
  customerName: 'Reader',
  email: 'reader@example.com',
  createdAt: '2026-10-07T00:00:00.000Z',
  subtotalCents: 1200,
  deliveryFeeCents: 500,
  totalCents: 1700,
  delivery: {
    address: {
      recipientName: 'Reader',
      phone: '1234567890',
      addressLine1: '12 Main St',
      addressLine2: null,
      city: 'NY',
      region: null,
      postalCode: null,
      countryCode: 'US',
    },
    shipment: null,
    shippedAt: null,
    deliveredAt: null,
  },
  payment: {
    required: true,
    cancellationPending: false,
    status: 'PAID',
    currency: 'usd',
    expiresAt: null,
    paidAt: null,
    refundedAt: null,
  },
  status: 'SUBMITTED',
  items: [{ title: 'Book', quantity: 1, unitPriceCents: 1200 }],
  history: [
    {
      id: '1',
      fromStatus: null,
      toStatus: 'SUBMITTED',
      createdAt: '2026-10-07T00:00:00.000Z',
      cancellationReason: null,
      actorName: 'Reader',
      actorType: 'USER',
      actorRole: 'CUSTOMER',
    },
  ],
}
export function mount(mocks: unknown[], role = 'STAFF') {
  return render(
    <MockedProvider mocks={mocks as never}>
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
        <MemoryRouter initialEntries={['/admin/orders/1']}>
          <Routes>
            <Route path="/admin/orders/:id" element={<OrderPage />} />
          </Routes>
        </MemoryRouter>
      </AccessContext.Provider>
    </MockedProvider>,
  )
}
const detail = {
  request: { query: AdminOrderDocument, variables: { id: '1' } },
  result: { data: { adminOrder: order } },
}
it('lets staff confirm acceptance and validates a customer-visible cancellation reason', async () => {
  const user = userEvent.setup()
  mount([detail])
  await user.click(await screen.findByRole('button', { name: 'Cancel request' }))
  expect(screen.getByRole('dialog').textContent).toContain('Submitted')
  expect(screen.getByText(/full refund including the delivery fee/i)).toBeTruthy()
  await user.click(screen.getByRole('button', { name: 'Confirm cancellation' }))
  expect(await screen.findByText('Enter a reason between 1 and 500 characters.')).toBeTruthy()
  expect(screen.getByLabelText('Reason shown to customer')).toBeTruthy()
})
it('shows no processing actions for terminal requests', async () => {
  mount([{ ...detail, result: { data: { adminOrder: { ...order, status: 'DELIVERED' } } } }])
  await screen.findByText('Delivered')
  expect(screen.queryByRole('button', { name: 'Cancel request' })).toBeNull()
})

it('requires fresh confirmation after a conflict and preserves the cancellation draft', async () => {
  const user = userEvent.setup()
  mount([
    detail,
    {
      request: {
        query: SetOrderStatusDocument,
        variables: {
          input: {
            id: '1',
            expectedStatus: 'SUBMITTED',
            status: 'CANCELLED',
            cancellationReason: 'Unable to supply',
          },
        },
      },
      result: { errors: [new GraphQLError('Changed', { extensions: { code: 'CONFLICT' } })] },
    },
    { ...detail, result: { data: { adminOrder: { ...order, status: 'PREPARING' } } } },
  ])
  await user.click(await screen.findByRole('button', { name: 'Cancel request' }))
  await user.type(screen.getByLabelText('Reason shown to customer'), '  Unable to supply  ')
  await user.click(screen.getByRole('button', { name: 'Confirm cancellation' }))
  expect(await screen.findByText(/The request changed/)).toBeTruthy()
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  await user.click(screen.getByRole('button', { name: 'Cancel request' }))
  expect(screen.getByLabelText('Reason shown to customer')).toHaveProperty(
    'value',
    '  Unable to supply  ',
  )
  expect(screen.getByRole('dialog').textContent).toContain('Preparing')
})
it('confirms a lost response only after refreshed server status matches', async () => {
  const user = userEvent.setup()
  mount([
    detail,
    {
      request: {
        query: SetOrderStatusDocument,
        variables: { input: { id: '1', expectedStatus: 'SUBMITTED', status: 'PREPARING' } },
      },
      error: new Error('Disconnected'),
    },
    { ...detail, result: { data: { adminOrder: { ...order, status: 'PREPARING' } } } },
  ])
  await user.click(await screen.findByRole('button', { name: 'Accept and prepare' }))
  await user.click(screen.getByRole('button', { name: 'Confirm preparation' }))
  expect(await screen.findByText('Request confirmed as Preparing.')).toBeTruthy()
  expect(screen.queryByRole('dialog')).toBeNull()
})
it('keeps uncertain failures deliberate without automatic replay', async () => {
  const user = userEvent.setup()
  mount([
    detail,
    {
      request: {
        query: SetOrderStatusDocument,
        variables: { input: { id: '1', expectedStatus: 'SUBMITTED', status: 'PREPARING' } },
      },
      error: new Error('Disconnected'),
    },
    detail,
  ])
  await user.click(await screen.findByRole('button', { name: 'Accept and prepare' }))
  await user.click(screen.getByRole('button', { name: 'Confirm preparation' }))
  expect(await screen.findByText(/Request refreshed. Review the action/)).toBeTruthy()
  expect(screen.queryByText('Request confirmed as Preparing.')).toBeNull()
  expect(screen.getByRole('dialog')).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Confirm preparation' })).toHaveProperty(
    'disabled',
    false,
  )
})

it('blocks acceptance of pending new orders and permits paid orders', async () => {
  mount([
    {
      ...detail,
      result: {
        data: {
          adminOrder: {
            ...order,
            payment: {
              ...order.payment,
              required: true,
              cancellationPending: false,
              status: 'PENDING',
            },
          },
        },
      },
    },
  ])
  await screen.findByText('Payment pending · USD')
  expect(screen.queryByRole('button', { name: 'Accept and prepare' })).toBeNull()
  expect(screen.getByRole('button', { name: 'Cancel request' })).toBeTruthy()
})
it('offers a confirmed refund retry only to processing staff', async () => {
  const user = userEvent.setup()
  mount([
    {
      ...detail,
      result: {
        data: {
          adminOrder: {
            ...order,
            status: 'CANCELLED',
            payment: {
              ...order.payment,
              required: true,
              cancellationPending: false,
              status: 'REFUND_FAILED',
            },
          },
        },
      },
    },
  ])
  await user.click(await screen.findByRole('button', { name: 'Retry refund' }))
  expect(screen.getByRole('dialog').textContent).toContain('full refund')
  expect(screen.getByRole('button', { name: 'Confirm refund retry' })).toBeTruthy()
})

it('offers shipment only for paid Preparing and requires explicit delivery confirmation for Shipped', async () => {
  const user = userEvent.setup()
  mount([{ ...detail, result: { data: { adminOrder: { ...order, status: 'PREPARING' } } } }])
  await user.click(await screen.findByRole('button', { name: 'Mark shipped' }))
  expect(screen.getByRole('dialog').textContent).toContain('cancellation will be unavailable')
  expect(screen.getByLabelText('Carrier (optional)')).toBeTruthy()
})
it('never offers cancellation for a shipped order', async () => {
  mount([{ ...detail, result: { data: { adminOrder: { ...order, status: 'SHIPPED' } } } }])
  expect(await screen.findByRole('button', { name: 'Confirm delivery' })).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Cancel request' })).toBeNull()
})

it('blocks shipment while cancellation is pending even for paid preparing orders', async () => {
  mount([
    {
      ...detail,
      result: {
        data: {
          adminOrder: {
            ...order,
            status: 'PREPARING',
            payment: { ...order.payment, cancellationPending: true },
          },
        },
      },
    },
  ])
  await screen.findByText('Preparing')
  expect(screen.queryByRole('button', { name: 'Mark shipped' })).toBeNull()
})

it.each(['Carrier\u0085Company', '\tCarrier'])(
  'rejects raw controls in shipment carrier %j before trimming or sending',
  async (carrier) => {
    const user = userEvent.setup()
    mount([{ ...detail, result: { data: { adminOrder: { ...order, status: 'PREPARING' } } } }])
    await user.click(await screen.findByRole('button', { name: 'Mark shipped' }))
    fireEvent.change(screen.getByLabelText('Carrier (optional)'), { target: { value: carrier } })
    await user.click(screen.getByRole('button', { name: 'Confirm shipment' }))
    expect(await screen.findByText(/Enter a carrier \(100 characters or fewer\)/)).toBeTruthy()
  },
)
