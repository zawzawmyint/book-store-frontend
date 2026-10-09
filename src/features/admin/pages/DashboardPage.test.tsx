// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { ApolloClient, ApolloLink, InMemoryCache, Observable } from '@apollo/client'
import { ApolloProvider } from '@apollo/client/react'
import { MemoryRouter } from 'react-router-dom'
import { AccessContext } from '../admin-access'
import DashboardPage from './DashboardPage'

afterEach(cleanup)
function setup(role = 'ADMIN') {
  const requests: { name: string; period?: string; deliver: (data: unknown) => void }[] = []
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink(
      (operation) =>
        new Observable((observer) => {
          requests.push({
            name: operation.operationName ?? 'Anonymous',
            period: operation.variables.period,
            deliver: (data) => {
              observer.next({ data: data as Record<string, unknown> })
              observer.complete()
            },
          })
        }),
    ),
  })
  const access = {
    role,
    loading: false,
    error: undefined,
    expired: false,
    retry: () => {},
    handleError: () => {},
    confirmRole: async () => {},
  }
  const tree = (nextRole: string) => (
    <ApolloProvider client={client}>
      <MemoryRouter initialEntries={['/admin']}>
        <AccessContext.Provider value={{ ...access, role: nextRole }}>
          <DashboardPage />
        </AccessContext.Provider>
      </MemoryRouter>
    </ApolloProvider>
  )
  const view = render(tree(role))
  return { requests, setRole: (nextRole: string) => view.rerender(tree(nextRole)) }
}
function finance(period: string, paidOrderCount: number) {
  return {
    adminDashboardFinance: {
      generatedAt: '2026-10-09T08:00:00Z',
      period,
      timeZone: 'Asia/Dubai',
      startDate: '2026-10-03',
      endDate: '2026-10-09',
      currency: 'usd',
      capturedCents: '0',
      refundedCents: '0',
      netCents: '0',
      paidOrderCount,
      days: [{ date: '2026-10-09', capturedCents: '0', refundedCents: '0', paidOrderCount }],
      failedRefundCount: 0,
      failedRefundOrders: [],
    },
  }
}
it('keeps the selected period paired with its values when older responses finish later', async () => {
  const { requests } = setup()
  await waitFor(() => expect(requests.some((req) => req.period === 'DAYS_30')).toBe(true))
  fireEvent.change(screen.getByLabelText('Payment period'), { target: { value: '7' } })
  await waitFor(() => expect(requests.some((req) => req.period === 'DAYS_7')).toBe(true))
  await act(async () => {
    requests.find((req) => req.period === 'DAYS_7')!.deliver(finance('DAYS_7', 7))
  })
  expect(screen.getByText('7', { selector: 'p' })).toBeTruthy()
  await act(async () => {
    requests.find((req) => req.period === 'DAYS_30')!.deliver(finance('DAYS_30', 30))
  })
  expect(screen.getByText('7', { selector: 'p' })).toBeTruthy()
  expect(screen.queryByText('30', { selector: 'p' })).toBeNull()
  expect(requests.filter((req) => req.name === 'WorkspaceDashboard')).toHaveLength(1)
})
it('removes finance during role loss and does not republish a pending Admin response', async () => {
  const { requests, setRole } = setup()
  await waitFor(() => expect(requests.some((req) => req.period === 'DAYS_30')).toBe(true))
  setRole('STAFF')
  expect(screen.queryByLabelText('Payment period')).toBeNull()
  await act(async () => {
    requests.find((req) => req.period === 'DAYS_30')!.deliver(finance('DAYS_30', 30))
  })
  expect(screen.queryByRole('region', { name: 'Financial overview' })).toBeNull()
  expect(screen.queryByText('Captured payments')).toBeNull()
})
it('Staff mounts only the operational query', async () => {
  const { requests } = setup('STAFF')
  await waitFor(() => expect(requests).toHaveLength(1))
  expect(requests[0].name).toBe('WorkspaceDashboard')
})

it('distinguishes actionable counts from normal activity and clears cues at zero after refresh', async () => {
  const { requests } = setup('STAFF')
  const workspace = (active: boolean) => ({
    workspaceDashboard: {
      generatedAt: '2026-10-09T08:00:00Z',
      fulfillment: ['SUBMITTED', 'PREPARING', 'SHIPPED', 'DELIVERED'].map((status) => ({
        status,
        count: active ? 1 : 0,
      })),
      lowStockCount: active ? 1 : 0,
      outOfStockCount: active ? 1 : 0,
      stockAlerts: active
        ? [
            { id: '1', title: 'Low book', stock: 3 },
            { id: '2', title: 'Empty book', stock: 0 },
          ]
        : [],
      awaitingPreparation: [],
      readyToShip: [],
      recentOrders: [],
    },
  })
  await waitFor(() => expect(requests).toHaveLength(1))
  await act(async () => requests[0].deliver(workspace(true)))
  const card = (name: string) => within(screen.getByRole('group', { name }))
  expect(card('Awaiting preparation').getByText('Needs attention')).toBeTruthy()
  expect(card('Preparing').getByText('In progress')).toBeTruthy()
  expect(card('Shipped').getByText('On the way')).toBeTruthy()
  expect(card('Low stock (1–5)').getByText('Needs restocking')).toBeTruthy()
  expect(card('Out of stock').getByText('Needs action')).toBeTruthy()
  const alerts = within(screen.getByRole('region', { name: 'Stock alerts' }))
  expect(alerts.getByText('Needs restocking')).toBeTruthy()
  expect(alerts.getByText('Out of stock')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Refresh dashboard' }))
  await waitFor(() => expect(requests).toHaveLength(2))
  await act(async () => requests[1].deliver(workspace(false)))
  expect(card('Awaiting preparation').getByText('Nothing pending')).toBeTruthy()
  expect(card('Low stock (1–5)').getByText('No issues')).toBeTruthy()
  expect(card('Out of stock').getByText('No issues')).toBeTruthy()
  expect(alerts.getByText('No stock alerts.')).toBeTruthy()
})
