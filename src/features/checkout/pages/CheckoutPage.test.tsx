import { checkoutAttempt } from '../checkout-attempt'
// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MockedProvider } from '@apollo/client/testing/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { useCartStore } from '../../cart/cart-store'
import { CreateCheckoutDocument } from '../../../generated/graphql'
import { CheckoutPage } from './CheckoutPage'
vi.mock('../../../lib/auth-client', () => ({
  authClient: {
    useSession: () => ({
      data: { user: { id: 'ada', name: 'Ada Reader', email: 'ada@example.com' } },
    }),
  },
}))
afterEach(() => {
  cleanup()
  useCartStore.getState().clear()
  localStorage.clear()
  sessionStorage.clear()
})
const item = {
  id: '1',
  title: 'A book',
  author: 'Author',
  genre: 'Fiction',
  priceCents: 1200,
  stock: 3,
  quantity: 1,
}
function mount(error?: Error, status = 'PENDING') {
  useCartStore.setState({ items: [item] })
  const variables = vi.fn(
    (value) =>
      value.input.items[0].bookId === '1' && /^[\da-f-]{36}$/i.test(value.input.requestKey),
  )
  render(
    <MockedProvider
      mocks={[
        {
          request: { query: CreateCheckoutDocument, variables },
          ...(error
            ? { error }
            : {
                result: {
                  data: {
                    createCheckout: {
                      order: {
                        __typename: 'MyOrder',
                        id: '1',
                        status: status === 'EXPIRED' ? 'CANCELLED' : 'SUBMITTED',
                        createdAt: '2026-10-07T00:00:00Z',
                        totalCents: 1200,
                        payment: {
                          required: true,
                          status,
                          currency: 'usd',
                          expiresAt: null,
                          paidAt: null,
                          refundedAt: null,
                        },
                        items: [{ title: 'A book', quantity: 1, unitPriceCents: 1200 }],
                        history: [],
                      },
                      checkoutUrl: null,
                    },
                  },
                },
              }),
        },
      ]}
    >
      <MemoryRouter>
        <Routes>
          <Route path="/" element={<CheckoutPage />} />
          <Route path="/checkout/return/1" element={<p>Confirming payment</p>} />
        </Routes>
      </MemoryRouter>
    </MockedProvider>,
  )
  return { user: userEvent.setup(), variables }
}
it('sends only lines and a UUID and preserves the bag when opening a pending order', async () => {
  const { user, variables } = mount()
  await user.click(screen.getByRole('button', { name: 'Continue to payment' }))
  await screen.findByText('Confirming payment')
  expect(variables.mock.calls[0][0].input).toEqual({
    items: [{ bookId: '1', quantity: 1 }],
    requestKey: expect.any(String),
  })
  expect(useCartStore.getState().items).toEqual([item])
})
it('preserves the bag and retry attempt on unavailable payment', async () => {
  const { user } = mount(new Error('Payment unavailable'))
  await user.click(screen.getByRole('button', { name: 'Continue to payment' }))
  await screen.findByText('Payment unavailable')
  expect(useCartStore.getState().items).toEqual([item])
  expect(JSON.parse(sessionStorage.getItem('book-store-checkout:ada')!).requestKey).toMatch(
    /^[\da-f-]{36}$/i,
  )
})

it('retires a server-confirmed cancelled expired checkout without clearing its bag', async () => {
  const previous = checkoutAttempt('ada', [item]).requestKey
  const { user } = mount(undefined, 'EXPIRED')
  await user.click(screen.getByRole('button', { name: 'Continue to payment' }))
  await screen.findByText('Confirming payment')
  expect(useCartStore.getState().items).toEqual([item])
  expect(checkoutAttempt('ada', [item]).requestKey).not.toBe(previous)
})
