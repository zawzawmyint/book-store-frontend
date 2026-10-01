// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MockedProvider } from '@apollo/client/testing/react'
import { GraphQLError } from 'graphql'
import { StockDialog } from './StockDialog'
import { AdjustBookStockDocument, AdminBookDocument } from '../../../generated/graphql'

afterEach(cleanup)
Object.defineProperty(HTMLDialogElement.prototype, 'close', {
  configurable: true,
  value() {
    this.removeAttribute('open')
  },
})
Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
  configurable: true,
  value() {
    this.setAttribute('open', '')
  },
})
const book = {
  id: '1',
  title: 'Inventory book',
  author: 'Author',
  genre: 'Genre',
  description: 'Description',
  priceCents: 100,
  stock: 4,
  archived: false,
}
it('does not automatically retry an uncertain adjustment and requires checking current inventory', async () => {
  const user = userEvent.setup()
  const saved = vi.fn()
  render(
    <MockedProvider
      mocks={[
        {
          request: { query: AdjustBookStockDocument, variables: { id: '1', delta: 3 } },
          error: new Error('Connection lost'),
        },
        {
          request: { query: AdminBookDocument, variables: { id: '1' } },
          result: { data: { adminBook: { ...book, stock: 7 } } },
        },
      ]}
    >
      <StockDialog book={book} close={() => {}} saved={saved} />
    </MockedProvider>,
  )
  await user.type(screen.getByLabelText('Quantity change'), '3')
  await user.click(screen.getByRole('button', { name: 'Apply adjustment' }))
  await screen.findByText(/The result is unknown/)
  expect(
    (screen.getByRole('button', { name: 'Apply adjustment' }) as HTMLButtonElement).disabled,
  ).toBe(true)
  expect(saved).not.toHaveBeenCalled()
  await user.click(screen.getByRole('button', { name: 'Check inventory' }))
  await screen.findByText(/This does not confirm whether the earlier adjustment ran/)
  expect(screen.getByLabelText('Quantity change')).toHaveProperty('value', '3')
  expect(screen.getByText('7', { exact: true })).toBeTruthy()
})

it('retains rejected adjustment input and refreshes stock without resubmitting', async () => {
  const user = userEvent.setup()
  render(
    <MockedProvider
      mocks={[
        {
          request: { query: AdjustBookStockDocument, variables: { id: '1', delta: -5 } },
          result: {
            errors: [
              new GraphQLError('Insufficient stock', { extensions: { code: 'BAD_USER_INPUT' } }),
            ],
          },
        },
        {
          request: { query: AdminBookDocument, variables: { id: '1' } },
          result: { data: { adminBook: { ...book, stock: 2 } } },
        },
      ]}
    >
      <StockDialog book={book} close={() => {}} saved={() => {}} />
    </MockedProvider>,
  )
  await user.type(screen.getByLabelText('Quantity change'), '-5')
  await user.click(screen.getByRole('button', { name: 'Apply adjustment' }))
  await screen.findByText('Insufficient stock')
  await screen.findByText('2', { exact: true })
  expect(screen.getByLabelText('Quantity change')).toHaveProperty('value', '-5')
})
