// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MockedProvider } from '@apollo/client/testing/react'
import { MemoryRouter } from 'react-router-dom'
import { useCartStore } from '../../cart/cart-store'
import { PLACE_ORDER } from '../../../lib/graphql'
import { CheckoutPage } from './CheckoutPage'

vi.mock('../../../lib/auth-client', () => ({ authClient: { useSession: () => ({ data: { user: { name: 'Ada Reader', email: 'ada@example.com' } } }) } }))

afterEach(() => {
  cleanup()
  useCartStore.getState().clear()
  localStorage.clear()
})

const item = { id: '1', title: 'A book', author: 'Author', genre: 'Fiction', priceCents: 1200, stock: 3, quantity: 1 }
const request = { query: PLACE_ORDER, variables: { input: { items: [{ bookId: '1', quantity: 1 }] } } }
const result = { data: { placeOrder: { id: '1', totalCents: 1200, items: [{ title: 'A book', quantity: 1, unitPriceCents: 1200 }] } } }

function checkout(mocks: React.ComponentProps<typeof MockedProvider>['mocks'] = []) {
  useCartStore.setState({ items: [item] })
  render(<MockedProvider mocks={mocks}><MemoryRouter><CheckoutPage /></MemoryRouter></MockedProvider>)
  return userEvent.setup()
}

describe('authenticated checkout', () => {
  it('sends only cart lines, then clears the cart and shows the receipt', async () => {
    const user = checkout([{ request, result }])
    expect(screen.getByText('ada@example.com')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Submit order request' }))
    await screen.findByText('Thank you, Ada.')
    await waitFor(() => expect(useCartStore.getState().items).toEqual([]))
  })

  it('keeps the cart when the server rejects the request', async () => {
    const user = checkout([{ request, error: new Error('Stock changed. Please try again.') }])
    await user.click(screen.getByRole('button', { name: 'Submit order request' }))
    await screen.findByText('Stock changed. Please try again.')
    expect(useCartStore.getState().items).toEqual([item])
  })
})
