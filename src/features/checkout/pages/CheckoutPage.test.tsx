import { GraphQLError } from 'graphql'
// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MockedProvider } from '@apollo/client/testing/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { useCartStore } from '../../cart/cart-store'
import {
  CreateCheckoutDocument,
  DeliveryOptionsDocument,
  QuoteCheckoutDocument,
} from '../../../generated/graphql'
import { CheckoutPage } from './CheckoutPage'
import { checkoutAttempt, clearCheckoutAttempts } from '../checkout-attempt'
const address = {
  recipientName: 'Ada Reader',
  phone: '1234567890',
  addressLine1: '12 Main St',
  addressLine2: null,
  city: 'NY',
  region: null,
  postalCode: null,
  countryCode: 'US',
}
const reviewed = {
  deliveryAddress: address,
  expectedDeliveryFeeCents: 500,
  expectedTotalCents: 1700,
}
const navigation = vi.hoisted(() => vi.fn())
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return {
    ...actual,
    useNavigate: () => {
      const navigate = actual.useNavigate()
      return (...args: Parameters<typeof navigate>) => {
        navigation(...args)
        return navigate(...args)
      }
    },
  }
})
vi.mock('../../../lib/auth-client', () => ({
  authClient: {
    useSession: () => ({
      data: { user: { id: 'ada', name: 'Ada Reader', email: 'ada@example.com' } },
      refetch: vi.fn(),
    }),
  },
}))
afterEach(() => {
  cleanup()
  useCartStore.getState().clear()
  clearCheckoutAttempts()
  localStorage.clear()
  sessionStorage.clear()
  navigation.mockClear()
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
function mount(
  error?: Error,
  optionsError?: Error,
  quoteDelay = 0,
  graphqlError: boolean | string = false,
  mutationDelay = 0,
) {
  useCartStore.setState({ items: [item] })
  const variables = vi.fn((value) => value.input.items[0].bookId === '1')
  const quoteVariables = vi.fn(() => true)
  const view = render(
    <MockedProvider
      mocks={[
        {
          request: { query: DeliveryOptionsDocument },
          ...(optionsError
            ? { error: optionsError }
            : {
                result: {
                  data: {
                    deliveryOptions: { countryCodes: ['US'], feeCents: 500, currency: 'usd' },
                  },
                },
              }),
        },
        {
          request: { query: QuoteCheckoutDocument, variables: quoteVariables },
          delay: quoteDelay,
          result: {
            data: {
              quoteCheckout: {
                subtotalCents: 1200,
                deliveryFeeCents: 500,
                totalCents: 1700,
                currency: 'usd',
              },
            },
          },
          maxUsageCount: 5,
        },
        {
          request: { query: CreateCheckoutDocument, variables },
          delay: mutationDelay,
          ...(graphqlError
            ? {
                result: {
                  errors: [
                    new GraphQLError('Price changed', {
                      extensions: {
                        code: typeof graphqlError === 'string' ? graphqlError : 'CONFLICT',
                      },
                    }),
                  ],
                },
              }
            : error
              ? { error }
              : {
                  result: {
                    data: {
                      createCheckout: {
                        order: {
                          __typename: 'MyOrder',
                          id: '1',
                          status: 'SUBMITTED',
                          createdAt: '2026-10-07T00:00:00Z',
                          subtotalCents: 1200,
                          deliveryFeeCents: 500,
                          totalCents: 1700,
                          delivery: { address, shipment: null, shippedAt: null, deliveredAt: null },
                          payment: {
                            required: true,
                            cancellationPending: false,
                            status: 'PENDING',
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
  return { user: userEvent.setup(), variables, quoteVariables, unmount: view.unmount }
}
async function fill(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByRole('option', { name: 'United States' })
  await user.type(screen.getByLabelText('Phone number'), '1234567890')
  await user.type(screen.getByLabelText('Address line 1'), '12 Main St')
  await user.type(screen.getByLabelText('City'), 'NY')
  await user.selectOptions(screen.getByLabelText('Country'), 'US')
  await user.click(screen.getByRole('button', { name: 'Review order' }))
  await screen.findByRole('button', { name: 'Continue to payment' })
}
it('requires server review then submits normalized destination and reviewed amounts', async () => {
  const { user, variables } = mount()
  expect(screen.queryByRole('button', { name: 'Continue to payment' })).toBeNull()
  await fill(user)
  await user.click(screen.getByRole('button', { name: 'Continue to payment' }))
  await screen.findByText('Confirming payment')
  expect(variables.mock.calls[0][0].input).toEqual({
    items: [{ bookId: '1', quantity: 1 }],
    requestKey: expect.any(String),
    ...reviewed,
  })
  expect(useCartStore.getState().items).toEqual([item])
})
it('invalidates reviewed destination when editing address', async () => {
  const { user } = mount()
  await fill(user)
  await user.click(screen.getByRole('button', { name: 'Edit address' }))
  await user.type(screen.getByLabelText('City'), ' changed')
  expect(screen.queryByRole('button', { name: 'Continue to payment' })).toBeNull()
})
it('preserves an uncertain attempted payload across reload despite disabled delivery options', async () => {
  const previous = checkoutAttempt('ada', [item], reviewed)
  const { user, variables, quoteVariables } = mount(undefined, new Error('Delivery unavailable'))
  await user.click(await screen.findByRole('button', { name: 'Retry payment setup' }))
  await screen.findByText('Confirming payment')
  expect(variables.mock.calls[0][0].input.requestKey).toBe(previous.requestKey)
  expect(variables.mock.calls[0][0].input.deliveryAddress).toEqual(address)
  expect(quoteVariables).not.toHaveBeenCalled()
})
it('retains form, cart and exact key after network failure', async () => {
  const { user } = mount(new Error('Disconnected'))
  await fill(user)
  await user.click(screen.getByRole('button', { name: 'Continue to payment' }))
  await screen.findByText(/Disconnected/)
  expect(useCartStore.getState().items).toEqual([item])
  expect(screen.getByRole('button', { name: 'Retry payment setup' })).toBeTruthy()
  expect(JSON.parse(sessionStorage.getItem('book-store-checkout:ada')!).deliveryAddress).toEqual(
    address,
  )
})

it('ignores a quote that resolves after the destination is edited', async () => {
  const { user } = mount(undefined, undefined, 250)
  await screen.findByRole('option', { name: 'United States' })
  await user.type(screen.getByLabelText('Phone number'), '1234567890')
  await user.type(screen.getByLabelText('Address line 1'), '12 Main St')
  await user.type(screen.getByLabelText('City'), 'NY')
  await user.selectOptions(screen.getByLabelText('Country'), 'US')
  await user.click(screen.getByRole('button', { name: 'Review order' }))
  await user.type(screen.getByLabelText('City'), ' changed')
  await screen.findByRole('button', { name: 'Review order' })
  expect(screen.queryByRole('button', { name: 'Continue to payment' })).toBeNull()
})
it('requires explicit renewed review after a price conflict and retains the destination', async () => {
  const { user } = mount(undefined, undefined, 0, true)
  await fill(user)
  await user.click(screen.getByRole('button', { name: 'Continue to payment' }))
  await screen.findByText(/Prices or delivery settings changed/)
  expect(screen.getByLabelText('Address line 1')).toHaveProperty('value', '12 Main St')
  expect(screen.queryByRole('button', { name: 'Continue to payment' })).toBeNull()
  expect(screen.getByRole('button', { name: 'Review order' })).toBeTruthy()
})

it('invalidates a reviewed quote even if a cart edit is later reverted', async () => {
  const { user } = mount()
  await fill(user)
  act(() => useCartStore.setState({ items: [{ ...item, quantity: 2 }] }))
  expect(screen.queryByRole('button', { name: 'Continue to payment' })).toBeNull()
  act(() => useCartStore.setState({ items: [item] }))
  expect(screen.queryByRole('button', { name: 'Continue to payment' })).toBeNull()
})

it('retains an attempted key when a BAD_USER_INPUT response may follow reservation', async () => {
  const { user } = mount(undefined, undefined, 0, 'BAD_USER_INPUT')
  await fill(user)
  await user.click(screen.getByRole('button', { name: 'Continue to payment' }))
  await screen.findByText('Price changed')
  expect(screen.getByRole('button', { name: 'Retry payment setup' })).toBeTruthy()
  expect(JSON.parse(sessionStorage.getItem('book-store-checkout:ada')!).deliveryAddress).toEqual(
    address,
  )
})

it('ignores a late checkout response after the account checkout view is unmounted', async () => {
  checkoutAttempt('ada', [item], reviewed)
  const { user, unmount } = mount(undefined, undefined, 0, false, 150)
  await user.click(await screen.findByRole('button', { name: 'Retry payment setup' }))
  unmount()
  clearCheckoutAttempts()
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 250))
  })
  expect(sessionStorage.getItem('book-store-checkout:ada')).toBeNull()
  expect(navigation).not.toHaveBeenCalled()
})
