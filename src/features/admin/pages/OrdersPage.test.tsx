// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MockedProvider } from '@apollo/client/testing/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AdminOrdersDocument } from '../../../generated/graphql'
import { TooltipProvider } from '../../../app/components/ui/tooltip'
import { OrdersPage } from './OrdersPage'
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
  mount('/admin/orders?status=ACCEPTED', { status: 'ACCEPTED', limit: 5, offset: 0 }, [
    {
      id: '1',
      userId: 'reader',
      status: 'ACCEPTED',
      customerName: 'Reader',
      email: 'r@example.com',
      createdAt: '2026-10-07',
      totalCents: 100,
      items: [],
    },
  ])
  expect(await screen.findByRole('link', { name: 'View request #1' })).toHaveProperty(
    'pathname',
    '/admin/orders/1',
  )
  expect(screen.getByLabelText('Status').textContent).toBe('Accepted')
})
it('falls back to All for an unknown status', async () => {
  mount('/admin/orders?status=UNKNOWN', { status: 'ALL', limit: 5, offset: 0 })
  expect(await screen.findByText('No order requests on this page.')).toBeTruthy()
  expect(screen.getByLabelText('Status').textContent).toBe('All')
})
