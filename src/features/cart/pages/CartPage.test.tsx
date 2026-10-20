// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { act, cleanup, render as testingRender, screen } from '@testing-library/react'
import { ApolloProvider } from '@apollo/client/react'
import { client } from '../../../lib/apollo-client'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { CartPage } from './CartPage'
import { useCartStore } from '../cart-store'

const render = (ui: React.ReactNode) =>
  testingRender(<ApolloProvider client={client}>{ui}</ApolloProvider>)
const item = {
  id: '1',
  title: 'The Great Gatsby',
  author: 'F. Scott Fitzgerald',
  genre: 'Classic Fiction',
  priceCents: 1699,
  quantity: 2,
  stock: 10,
  available: true,
}
beforeEach(() => {
  useCartStore.setState({ items: [item], owner: 'reader', status: 'ready', revision: '1' })
})
afterEach(cleanup)

it('shows the browse action only for a settled empty bag', () => {
  useCartStore.setState({ items: [], status: 'loading' })
  render(
    <MemoryRouter>
      <CartPage />
    </MemoryRouter>,
  )
  expect(screen.queryByText('Nothing here yet.')).toBeNull()
  act(() => useCartStore.setState({ status: 'ready' }))
  expect(screen.getByText('Nothing here yet.')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Browse books' })).toHaveAttribute('href', '/books')
  expect(screen.queryByRole('link', { name: 'Continue to checkout' })).toBeNull()
})

it('distinguishes unit and line prices and updates amounts with quantity', async () => {
  const update = vi.spyOn(useCartStore.getState(), 'update').mockImplementation((id, quantity) => {
    useCartStore.setState({ items: [{ ...item, id, quantity }] })
  })
  render(
    <MemoryRouter>
      <CartPage />
    </MemoryRouter>,
  )
  expect(screen.getByText('$16.99 each')).toBeInTheDocument()
  expect(screen.getByText('Line total for The Great Gatsby:').parentElement).toHaveTextContent(
    '$33.98',
  )
  expect(screen.getByRole('complementary')).toHaveTextContent('Calculated at checkout')
  await userEvent.click(screen.getByRole('button', { name: 'Add one The Great Gatsby' }))
  expect(screen.getByText('Line total for The Great Gatsby:').parentElement).toHaveTextContent(
    '$50.97',
  )
  update.mockRestore()
})

it('uses the same checkout gating for the mobile action and desktop summary', () => {
  render(
    <MemoryRouter>
      <CartPage />
    </MemoryRouter>,
  )
  expect(screen.getAllByRole('link', { name: 'Continue to checkout' })).toHaveLength(2)
  act(() => useCartStore.setState({ status: 'saving' }))
  expect(screen.queryByRole('link', { name: 'Continue to checkout' })).toBeNull()
  expect(
    screen
      .getAllByRole('button', { name: 'Continue to checkout' })
      .every((el) => el.hasAttribute('disabled')),
  ).toBe(true)
  act(() => useCartStore.setState({ status: 'ready', items: [{ ...item, available: false }] }))
  expect(screen.queryByRole('link', { name: 'Continue to checkout' })).toBeNull()
  act(() => useCartStore.setState({ items: [] }))
  expect(screen.queryByRole('button', { name: 'Continue to checkout' })).toBeNull()
})
