// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MockedProvider } from '@apollo/client/testing/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AdminOrdersDocument } from '../../../generated/graphql'
import { TooltipProvider } from '../../../app/components/ui/tooltip'
import { OrdersPage } from './OrdersPage'
import userEvent from '@testing-library/user-event'
afterEach(cleanup)
function mount(url: string, variables: Record<string, unknown>, items: unknown[] = []) {
  render(
    <TooltipProvider>
      <MockedProvider
        mocks={[
          {
            request: { query: AdminOrdersDocument, variables },
            result: { data: { adminOrders: { total: items.length, items } } },
            maxUsageCount: 5,
          },
        ]}
      >
        <MemoryRouter initialEntries={[url]}>
          <Routes>
            <Route path="/admin/orders" element={<OrdersPage />} />
          </Routes>
        </MemoryRouter>
      </MockedProvider>
    </TooltipProvider>,
  )
}
it('uses a URL-backed status filter and preserves it in detail return navigation', async () => {
  mount('/admin/orders?status=PREPARING', { status: 'PREPARING', limit: 5, offset: 0 }, [
    {
      id: '1',
      userId: 'reader',
      status: 'PREPARING',
      customerName: 'Reader',
      email: 'r@example.com',
      createdAt: '2026-10-07',
      totalCents: 100,
      payment: {
        required: true,
        cancellationPending: false,
        status: 'PAID',
        currency: 'usd',
        expiresAt: null,
        paidAt: null,
        refundedAt: null,
      },
      items: [],
    },
  ])
  expect(await screen.findByRole('link', { name: 'View request #1' })).toHaveProperty(
    'pathname',
    '/admin/orders/1',
  )
  expect(screen.getByLabelText('Status').textContent).toBe('Preparing')
})
it('falls back to All for an unknown status', async () => {
  mount('/admin/orders?status=UNKNOWN', { status: 'ALL', limit: 5, offset: 0 })
  expect(await screen.findByText('No order requests on this page.')).toBeTruthy()
  expect(screen.getByLabelText('Status').textContent).toBe('All')
})

it('keeps optional columns hidden across server pages while retaining the URL status filter', async () => {
  const user = userEvent.setup()
  const order = {
    id: '1',
    userId: 'reader',
    status: 'PREPARING',
    customerName: 'Reader',
    email: 'r@example.com',
    createdAt: '2026-10-07',
    totalCents: 100,
    payment: {
      required: true,
      cancellationPending: false,
      status: 'PAID',
      currency: 'usd',
      expiresAt: null,
      paidAt: null,
      refundedAt: null,
    },
    items: [],
  }
  const mocks = [0, 5].map((offset) => ({
    request: { query: AdminOrdersDocument, variables: { status: 'PREPARING', limit: 5, offset } },
    delay: 50,
    result: { data: { adminOrders: { total: 11, items: [{ ...order, id: String(offset + 1) }] } } },
  }))
  render(
    <TooltipProvider>
      <MockedProvider mocks={mocks}>
        <MemoryRouter initialEntries={['/admin/orders?status=PREPARING']}>
          <Routes>
            <Route path="/admin/orders" element={<OrdersPage />} />
          </Routes>
        </MemoryRouter>
      </MockedProvider>
    </TooltipProvider>,
  )
  await screen.findByRole('link', { name: 'View request #1' })
  await user.click(screen.getByRole('button', { name: 'Columns' }))
  await user.click(screen.getByRole('menuitemcheckbox', { name: 'Date' }))
  await user.keyboard('{Escape}')
  await user.click(screen.getByRole('button', { name: 'Next' }))
  await screen.findByRole('link', { name: 'View request #6' })
  expect(screen.queryByRole('columnheader', { name: 'Date' })).toBeNull()
  expect(screen.getByLabelText('Status').textContent).toBe('Preparing')
  expect(screen.getByText('Showing 6–6 of 11')).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Next' })).toHaveProperty('disabled', false)
})
