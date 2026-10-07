// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MockedProvider } from '@apollo/client/testing/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { RefreshOrderPaymentDocument } from '../../../generated/graphql'
import { CheckoutReturnPage } from './CheckoutReturnPage'
import { checkoutAttempt } from '../checkout-attempt'
import { useCartStore } from '../../cart/cart-store'
vi.mock('../../../lib/auth-client', () => ({
  authClient: { useSession: () => ({ data: { user: { id: 'return-reader' } }, refetch: vi.fn() }) },
}))
afterEach(() => {
  cleanup()
  sessionStorage.clear()
  useCartStore.getState().clear()
})
const item = {
  id: '1',
  title: 'Book',
  author: 'Author',
  genre: 'Fiction',
  priceCents: 1200,
  stock: 3,
  quantity: 1,
}
function mount(status = 'PAID', path = '/checkout/return/7?outcome=success') {
  const order = {
    __typename: 'MyOrder',
    id: '7',
    createdAt: '2026-10-07T00:00:00Z',
    status: status === 'EXPIRED' ? 'CANCELLED' : 'SUBMITTED',
    totalCents: 1200,
    payment: {
      required: true,
      status,
      currency: 'usd',
      paidAt: null,
      refundedAt: null,
      expiresAt: null,
    },
    items: [{ title: 'Book', quantity: 1, unitPriceCents: 1200 }],
    history: [],
  }
  render(
    <MockedProvider
      mocks={[
        {
          request: { query: RefreshOrderPaymentDocument, variables: { orderId: '7' } },
          result: { data: { refreshOrderPayment: order } },
        },
      ]}
    >
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/checkout/return/:orderId" element={<CheckoutReturnPage />} />
        </Routes>
      </MemoryRouter>
    </MockedProvider>,
  )
}
it('clears an unchanged bag only after server confirmed Paid', async () => {
  useCartStore.setState({ items: [item] })
  checkoutAttempt('return-reader', [item], '7')
  mount()
  await screen.findByRole('heading', { name: 'Payment confirmed' })
  expect(useCartStore.getState().items).toEqual([])
})
it('preserves books added while payment was open', async () => {
  checkoutAttempt('return-reader', [item], '7')
  useCartStore.setState({ items: [{ ...item, quantity: 2 }] })
  mount()
  await screen.findByRole('heading', { name: 'Payment confirmed' })
  expect(useCartStore.getState().items[0].quantity).toBe(2)
})
it('never trusts a success query hint when the server says Pending', async () => {
  useCartStore.setState({ items: [item] })
  mount('PENDING')
  await screen.findByText('Payment pending · USD')
  expect(screen.queryByRole('heading', { name: 'Payment confirmed' })).toBeNull()
  expect(screen.getByRole('button', { name: 'Resume payment' })).toBeTruthy()
  expect(useCartStore.getState().items).toEqual([item])
})
it('does not clear another customer or device bag with no saved snapshot', async () => {
  useCartStore.setState({ items: [item] })
  mount()
  await screen.findByRole('heading', { name: 'Payment confirmed' })
  expect(useCartStore.getState().items).toEqual([item])
})

it('retires only the matching server-confirmed expired attempt and preserves the bag', async () => {
  useCartStore.setState({ items: [item] })
  const previous = checkoutAttempt('return-reader', [item], '7').requestKey
  const other = checkoutAttempt('other-reader', [item], '7').requestKey
  mount('EXPIRED')
  await screen.findByText('Payment expired · USD')
  expect(useCartStore.getState().items).toEqual([item])
  expect(checkoutAttempt('return-reader', [item]).requestKey).not.toBe(previous)
  expect(checkoutAttempt('other-reader', [item]).requestKey).toBe(other)
})
it('does not retire a saved attempt for a different order on expiry', async () => {
  const previous = checkoutAttempt('return-reader', [item], '8').requestKey
  mount('EXPIRED')
  await screen.findByText('Payment expired · USD')
  expect(checkoutAttempt('return-reader', [item]).requestKey).toBe(previous)
})
