// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MockedProvider } from '@apollo/client/testing/react'
import { MemoryRouter } from 'react-router-dom'
import {
  NotificationCountDocument,
  NotificationFeedDocument,
  ReadAllNotificationsDocument,
  type NotificationFieldsFragment,
} from '../../generated/graphql'
import { TooltipProvider } from '../../app/components/ui/tooltip'
import { setLanguage } from '../../lib/i18n'
import { NotificationProvider } from './NotificationProvider'
import { NotificationBell } from './NotificationBell'
import { notificationMessage } from './notification-message'
vi.mock('../../lib/auth-client', () => ({
  authClient: {
    useSession: () => ({ data: { user: { id: 'reader', emailVerified: true } }, refetch: vi.fn() }),
  },
}))
vi.mock('../admin/admin-access', () => ({
  useAdminAccess: () => ({ role: 'USER', retry: vi.fn(), handleError: vi.fn() }),
}))
vi.mock('./notification-stream', () => ({ connectNotificationStream: () => vi.fn() }))
vi.mock('../../app/hooks/use-mobile', () => ({ useIsMobile: () => false }))
beforeEach(() => vi.stubEnv('VITE_IN_APP_NOTIFICATIONS_ENABLED', 'true'))
afterEach(() => {
  cleanup()
  vi.unstubAllEnvs()
  void setLanguage('en')
})
it('caps only the visual badge, opens without marking read, and refetches after read-all', async () => {
  let unread = 103
  const readAll = vi.fn(() => {
    unread = 0
    return { data: { markAllNotificationsRead: { changedCount: 103 } } }
  })
  render(
    <MockedProvider
      mocks={[
        {
          request: { query: NotificationCountDocument, variables: { scope: 'STOREFRONT' } },
          result: () => ({ data: { notificationUnreadCount: unread } }),
          maxUsageCount: 10,
        },
        {
          request: {
            query: NotificationFeedDocument,
            variables: { scope: 'STOREFRONT', first: 10, unreadOnly: false },
          },
          result: {
            data: {
              notifications: { nodes: [], pageInfo: { endCursor: null, hasNextPage: false } },
            },
          },
          maxUsageCount: 10,
        },
        {
          request: { query: ReadAllNotificationsDocument, variables: { scope: 'STOREFRONT' } },
          result: readAll,
        },
      ]}
    >
      <MemoryRouter>
        <TooltipProvider>
          <NotificationProvider scope="STOREFRONT">
            <NotificationBell />
          </NotificationProvider>
        </TooltipProvider>
      </MemoryRouter>
    </MockedProvider>,
  )
  expect(
    screen.getByRole('button', { name: 'Notifications, unread count unavailable' }),
  ).toBeTruthy()
  const bell = await screen.findByRole('button', { name: 'Notifications, 103 unread' })
  expect(screen.getByText('99+')).toBeTruthy()
  fireEvent.click(bell)
  expect(await screen.findByRole('dialog')).toBeTruthy()
  expect(screen.getByRole('dialog').getAttribute('aria-modal')).not.toBe('true')
  expect(document.querySelector('[data-slot="dialog-overlay"]')).toBeNull()
  expect(screen.queryByText('Notifications are kept for 90 days.')).toBeNull()
  expect(screen.queryByRole('combobox', { name: 'Language' })).toBeNull()
  expect(await screen.findByText('You have no notifications here.')).toBeTruthy()
  expect(readAll).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Mark all as read' }))
  await waitFor(() => expect(readAll).toHaveBeenCalledTimes(1))
  expect(
    await screen.findByRole('button', { name: 'Notifications, 0 unread', hidden: true }),
  ).toBeTruthy()
  expect(screen.queryByText('99+')).toBeNull()
})
it('localizes all ten event messages and preserves plain-text book titles with neutral future-kind fallback', async () => {
  const kinds = [
    'PAYMENT_CONFIRMED',
    'ORDER_ACCEPTED',
    'ORDER_SHIPPED',
    'ORDER_DELIVERED',
    'ORDER_CANCELLED',
    'REFUND_COMPLETED',
    'NEW_PAID_ORDER',
    'STOCK_LOW',
    'STOCK_OUT',
    'REFUND_FAILED',
  ]
  for (const lang of ['en', 'ar', 'th', 'zh-Hans'] as const) {
    await setLanguage(lang)
    for (const kind of kinds) {
      const item = {
        kind,
        resourceId: '12',
        bookTitle: '<b>Reader title</b>',
        stockAtEvent: 2,
      } as NotificationFieldsFragment
      const message = notificationMessage(item)
      expect(message).not.toContain('common:')
      expect(message).not.toContain('notification_')
      if (kind.startsWith('STOCK_')) expect(message).toContain('<b>Reader title</b>')
    }
    expect(
      notificationMessage({ kind: 'FUTURE_KIND' } as unknown as NotificationFieldsFragment),
    ).not.toContain('FUTURE_KIND')
  }
})
