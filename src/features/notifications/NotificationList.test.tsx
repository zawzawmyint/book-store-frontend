// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import type { NotificationFieldsFragment } from '../../generated/graphql'
import { NotificationContext, type InboxScope } from './notification-context'
import { NotificationList } from './NotificationList'

afterEach(cleanup)
const item: NotificationFieldsFragment = {
  id: 'notice-1',
  scope: 'STOREFRONT',
  kind: 'PAYMENT_CONFIRMED',
  resourceType: 'ORDER',
  resourceId: '8',
  createdAt: '2026-10-20T08:00:00Z',
  readAt: null,
  testPayment: true,
  refundPhase: null,
  bookTitle: null,
  stockAtEvent: null,
}
function Location() {
  return <output>{useLocation().pathname}</output>
}
function setup(node = item, markRead = vi.fn(async () => true), scope: InboxScope = 'STOREFRONT') {
  const onNavigate = vi.fn()
  const view = render(
    <MemoryRouter>
      <NotificationContext.Provider
        value={{
          scope,
          enabled: true,
          count: 1,
          pending: false,
          error: false,
          markRead,
          refresh: async () => {},
          handleError: vi.fn(),
          register: () => () => {},
        }}
      >
        <NotificationList nodes={[node]} onNavigate={onNavigate} />
        <Location />
      </NotificationContext.Provider>
    </MemoryRouter>,
  )
  return { ...view, markRead, onNavigate }
}
it.each(['STOREFRONT', 'WORKSPACE'] as const)(
  'opens the %s destination from the message row even when read fails',
  async (scope) => {
    const markRead = vi.fn(async () => false)
    const { onNavigate } = setup({ ...item, scope }, markRead, scope)
    const row = screen.getByRole('link', { name: /Payment confirmed for order #8/ })
    expect(row.getAttribute('href')).toBe(
      scope === 'STOREFRONT' ? '/account/orders/8' : '/admin/orders/8',
    )
    expect(row.querySelector('svg[aria-hidden="true"]')).toBeTruthy()
    expect(screen.getByText('Test payment')).toBeTruthy()
    expect(screen.getByText('Unread')).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'View' })).toBeNull()
    fireEvent.click(row)
    await waitFor(() => expect(onNavigate).toHaveBeenCalledOnce())
    expect(markRead).toHaveBeenCalledWith('notice-1')
    expect(screen.getByRole('status').textContent).toBe(
      scope === 'STOREFRONT' ? '/account/orders/8' : '/admin/orders/8',
    )
  },
)
it('keeps modified activation native without marking read', () => {
  const { markRead, onNavigate } = setup()
  fireEvent.click(screen.getByRole('link', { name: /Payment confirmed/ }), { ctrlKey: true })
  expect(markRead).not.toHaveBeenCalled()
  expect(onNavigate).not.toHaveBeenCalled()
})
it('marks an unread item without navigating, including items without a safe link', () => {
  const { markRead, onNavigate } = setup({ ...item, resourceId: '../unsafe' })
  expect(screen.queryByRole('link')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: /Mark as read/ }))
  expect(markRead).toHaveBeenCalledWith('notice-1')
  expect(onNavigate).not.toHaveBeenCalled()
})
it('does not navigate after the list unmounts during a read request', async () => {
  let finish!: (value: boolean) => void
  const markRead = vi.fn(
    () =>
      new Promise<boolean>((resolve) => {
        finish = resolve
      }),
  )
  const { unmount, onNavigate } = setup(item, markRead)
  fireEvent.click(screen.getByRole('link', { name: /Payment confirmed/ }))
  unmount()
  finish(true)
  await Promise.resolve()
  expect(onNavigate).not.toHaveBeenCalled()
})
