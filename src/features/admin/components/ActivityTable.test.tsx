// @vitest-environment jsdom
import { TooltipProvider } from '../../../app/components/ui/tooltip'
import { afterEach, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ActivityTable } from './ActivityTable'
import type { ActivityEventFieldsFragment } from '../../../generated/graphql'
afterEach(cleanup)
const event: ActivityEventFieldsFragment = {
  id: '1',
  actorUserId: 'ada',
  actorType: 'USER',
  actorName: 'Ada at time of change',
  actorRole: 'STAFF',
  source: 'GRAPHQL',
  action: 'BOOK_UPDATED',
  targetType: 'BOOK',
  targetId: '1',
  targetName: 'Historical title',
  changes: [
    { field: 'PRICE_CENTS', before: '1000', after: '1299' },
    { field: 'DESCRIPTION', before: null, after: '<script>alert(1)</script>' },
  ],
  stockDelta: null,
  createdAt: '2026-10-05T00:00:00.000Z',
}
it('presents one combined event with snapshot role, escaped before/after details and target history', () => {
  const { container } = renderWithTooltip(
    <MemoryRouter>
      <ActivityTable items={[event]} total={1} page={1} onPageChange={() => {}} />
    </MemoryRouter>,
  )
  expect(screen.getAllByText('Book updated')).toHaveLength(1)
  expect(screen.getByText('Recorded role: Staff')).toBeTruthy()
  expect(screen.getByText('Previous: $10.00')).toBeTruthy()
  expect(screen.getByText('New: $12.99')).toBeTruthy()
  expect(screen.getByText('Previous: Not previously set')).toBeTruthy()
  expect(screen.getByText('New: <script>alert(1)</script>')).toBeTruthy()
  expect(container.querySelector('script')).toBeNull()
  expect(screen.getByRole('link', { name: 'Book history' }).getAttribute('href')).toBe(
    '/admin/books/1/history',
  )
})
it('attributes operator actions without implying a named human and shows signed stock changes', () => {
  renderWithTooltip(
    <MemoryRouter>
      <ActivityTable
        items={[
          {
            ...event,
            source: 'OPERATOR',
            actorType: 'USER',
            actorName: 'Do not imply human',
            actorRole: null,
            stockDelta: 3,
          },
        ]}
        total={1}
        page={1}
        onPageChange={() => {}}
      />
    </MemoryRouter>,
  )
  expect(screen.getByText('Operator command')).toBeTruthy()
  expect(screen.queryByText('Do not imply human')).toBeNull()
  expect(screen.getByText('Stock delta: +3')).toBeTruthy()
})
it('explains the deployment-start boundary for empty history', () => {
  renderWithTooltip(
    <MemoryRouter>
      <ActivityTable items={[]} total={0} page={1} onPageChange={() => {}} />
    </MemoryRouter>,
  )
  expect(screen.getByText('No activity recorded yet')).toBeTruthy()
  expect(screen.getByText(/Earlier changes were not captured/)).toBeTruthy()
})

function renderWithTooltip(ui: Parameters<typeof render>[0]) {
  const result = render(<TooltipProvider>{ui}</TooltipProvider>)
  return {
    ...result,
    rerender: (next: typeof ui) => result.rerender(<TooltipProvider>{next}</TooltipProvider>),
  }
}

Object.defineProperty(globalThis, 'ResizeObserver', {
  configurable: true,
  value: class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
})
it('links audited workflow targets to order details and labels status changes', () => {
  renderWithTooltip(
    <MemoryRouter>
      <ActivityTable
        items={[
          {
            ...event,
            action: 'ORDER_STATUS_CHANGED',
            targetType: 'ORDER',
            targetId: '17',
            targetName: 'Order request #17',
            changes: [{ field: 'ORDER_STATUS', before: 'SUBMITTED', after: 'ACCEPTED' }],
            stockDelta: null,
          },
        ]}
        total={1}
        page={1}
        onPageChange={() => {}}
      />
    </MemoryRouter>,
  )
  expect(screen.getByText('Order status changed')).toBeTruthy()
  expect(screen.getByText('Order status')).toBeTruthy()
  expect(screen.getByText('Previous: Submitted')).toBeTruthy()
  expect(screen.getByText('New: Accepted')).toBeTruthy()
  expect(screen.getByRole('link', { name: 'View order request' }).getAttribute('href')).toBe(
    '/admin/orders/17',
  )
})

it('renders system payment activity without a fabricated recorded role', () => {
  renderWithTooltip(<MemoryRouter><ActivityTable items={[{ ...event, actorUserId: null, actorType: 'SYSTEM', actorRole: null, source: 'SYSTEM', action: 'ORDER_PAYMENT_CHANGED', changes: [{ field: 'ORDER_PAYMENT_STATUS', before: 'PENDING', after: 'PAID' }] }]} total={1} page={1} onPageChange={() => {}} /></MemoryRouter>)
  expect(screen.getByText('System')).toBeTruthy()
  expect(screen.getByText('Payment status changed')).toBeTruthy()
  expect(screen.queryByText(/Recorded role/)).toBeNull()
})
