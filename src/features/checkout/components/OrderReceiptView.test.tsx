// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { OrderReceiptView } from './OrderReceiptView'
afterEach(cleanup)
it('links the submitted receipt to owner-scoped details', () => {
  render(
    <MemoryRouter>
      <OrderReceiptView
        name="Reader"
        receipt={{ id: '1', status: 'SUBMITTED', totalCents: 1200, items: [] }}
      />
    </MemoryRouter>,
  )
  expect(screen.getByRole('link', { name: 'View order details' }).getAttribute('href')).toBe(
    '/account/orders/1',
  )
  expect(screen.getByText('Submitted')).toBeTruthy()
})
