import { GraphQLError } from 'graphql'
// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
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
  totalCents: 1200,
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
  expect(screen.getByText(/saved book quantities return to stock/i)).toBeTruthy()
  await user.click(screen.getByRole('button', { name: 'Confirm cancellation' }))
  expect(await screen.findByText('Enter a reason between 1 and 500 characters.')).toBeTruthy()
  expect(screen.getByLabelText('Reason shown to customer')).toBeTruthy()
})
it('shows no processing actions for terminal requests', async () => {
  mount([{ ...detail, result: { data: { adminOrder: { ...order, status: 'COMPLETED' } } } }])
  await screen.findByText('Completed')
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
    { ...detail, result: { data: { adminOrder: { ...order, status: 'ACCEPTED' } } } },
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
  expect(screen.getByRole('dialog').textContent).toContain('Accepted')
})
it('confirms a lost response only after refreshed server status matches', async () => {
  const user = userEvent.setup()
  mount([
    detail,
    {
      request: {
        query: SetOrderStatusDocument,
        variables: { input: { id: '1', expectedStatus: 'SUBMITTED', status: 'ACCEPTED' } },
      },
      error: new Error('Disconnected'),
    },
    { ...detail, result: { data: { adminOrder: { ...order, status: 'ACCEPTED' } } } },
  ])
  await user.click(await screen.findByRole('button', { name: 'Accept request' }))
  await user.click(screen.getByRole('button', { name: 'Confirm acceptance' }))
  expect(await screen.findByText('Request confirmed as Accepted.')).toBeTruthy()
  expect(screen.queryByRole('dialog')).toBeNull()
})
it('keeps uncertain failures deliberate without automatic replay', async () => {
  const user = userEvent.setup()
  mount([
    detail,
    {
      request: {
        query: SetOrderStatusDocument,
        variables: { input: { id: '1', expectedStatus: 'SUBMITTED', status: 'ACCEPTED' } },
      },
      error: new Error('Disconnected'),
    },
    detail,
  ])
  await user.click(await screen.findByRole('button', { name: 'Accept request' }))
  await user.click(screen.getByRole('button', { name: 'Confirm acceptance' }))
  expect(await screen.findByText(/Request refreshed. Review the action/)).toBeTruthy()
  expect(screen.queryByText('Request confirmed as Accepted.')).toBeNull()
  expect(screen.getByRole('dialog')).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Confirm acceptance' })).toHaveProperty(
    'disabled',
    false,
  )
})
