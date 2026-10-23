// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MockedProvider } from '@apollo/client/testing/react'
import { GraphQLError } from 'graphql'
import { InMemoryCache } from '@apollo/client'
import {
  NotificationCountDocument,
  ReadAllNotificationsDocument,
  ReadNotificationDocument,
} from '../../generated/graphql'
import { NotificationProvider } from './NotificationProvider'
import { useNotifications } from './notification-context'
import { authClient } from '../../lib/auth-client'
const fixtures = vi.hoisted(() => ({
  session: { user: { id: 'reader-a', emailVerified: true } },
  connect: vi.fn(() => vi.fn()),
}))
vi.mock('../../lib/auth-client', () => ({
  authClient: {
    useSession: () => ({ data: fixtures.session, refetch: vi.fn() }),
    getSession: vi.fn(),
  },
}))
vi.mock('../admin/admin-access', () => ({
  useAdminAccess: () => ({ role: 'USER', retry: vi.fn(), handleError: vi.fn() }),
}))
vi.mock('./notification-stream', () => ({ connectNotificationStream: fixtures.connect }))
beforeEach(() => {
  vi.stubEnv('VITE_IN_APP_NOTIFICATIONS_ENABLED', 'true')
  fixtures.session = { user: { id: 'reader-a', emailVerified: true } }
  fixtures.connect.mockClear()
  vi.mocked(authClient.getSession).mockClear()
})
afterEach(() => {
  cleanup()
  vi.unstubAllEnvs()
})
function Probe() {
  const inbox = useNotifications()
  return (
    <>
      <output>
        {inbox.enabled ? (inbox.count === undefined ? 'unknown' : String(inbox.count)) : 'disabled'}
      </output>
      <span>{inbox.error ? 'failed' : ''}</span>
      <button
        onClick={() => {
          void inbox.markRead()
        }}
      >
        Read all
      </button>
      <button
        onClick={() => {
          void inbox.markRead('private-old')
        }}
      >
        Read one
      </button>
      <button
        onClick={() => {
          void inbox.refresh()
        }}
      >
        Refresh
      </button>
    </>
  )
}
it('keeps an unknown count distinct from zero and does not reduce it on failed read', async () => {
  render(
    <MockedProvider
      mocks={[
        {
          request: { query: NotificationCountDocument, variables: { scope: 'STOREFRONT' } },
          result: { data: { notificationUnreadCount: 103 } },
        },
        {
          request: { query: ReadAllNotificationsDocument, variables: { scope: 'STOREFRONT' } },
          error: new Error('offline'),
        },
      ]}
    >
      <NotificationProvider scope="STOREFRONT">
        <Probe />
      </NotificationProvider>
    </MockedProvider>,
  )
  expect(screen.getByText('unknown')).toBeTruthy()
  expect(await screen.findByText('103')).toBeTruthy()
  fireEvent.click(screen.getByText('Read all'))
  expect(await screen.findByText('failed')).toBeTruthy()
  expect(screen.getByText('103')).toBeTruthy()
  expect(fixtures.connect).toHaveBeenCalledTimes(1)
})
it('hides the runtime disabled feature and closes transport', async () => {
  const close = vi.fn()
  fixtures.connect.mockReturnValueOnce(close)
  render(
    <MockedProvider
      mocks={[
        {
          request: { query: NotificationCountDocument, variables: { scope: 'STOREFRONT' } },
          result: {
            errors: [
              new GraphQLError('Disabled', { extensions: { code: 'NOTIFICATIONS_DISABLED' } }),
            ],
          },
        },
      ]}
    >
      <NotificationProvider scope="STOREFRONT">
        <Probe />
      </NotificationProvider>
    </MockedProvider>,
  )
  expect(await screen.findByText('disabled')).toBeTruthy()
  expect(close).toHaveBeenCalledTimes(1)
})
it.each([
  { codes: ['OTHER', 'NOTIFICATIONS_DISABLED', 'UNAUTHENTICATED'], refreshes: 0 },
  { codes: ['OTHER', 'UNAUTHENTICATED', 'NOTIFICATIONS_DISABLED'], refreshes: 1 },
])('uses the first recognized notification code in $codes', async ({ codes, refreshes }) => {
  render(
    <MockedProvider
      mocks={[
        {
          request: { query: NotificationCountDocument, variables: { scope: 'STOREFRONT' } },
          result: { errors: codes.map((code) => new GraphQLError(code, { extensions: { code } })) },
        },
      ]}
    >
      <NotificationProvider scope="STOREFRONT">
        <Probe />
      </NotificationProvider>
    </MockedProvider>,
  )
  expect(await screen.findByText('disabled')).toBeTruthy()
  expect(authClient.getSession).toHaveBeenCalledTimes(refreshes)
})

it('clears old identity immediately and ignores its late response', async () => {
  const close = vi.fn()
  fixtures.connect.mockReturnValueOnce(close)
  const tree = (
    <MockedProvider
      mocks={[
        {
          request: { query: NotificationCountDocument, variables: { scope: 'STOREFRONT' } },
          delay: 600,
          result: { data: { notificationUnreadCount: 777 } },
        },
        {
          request: { query: NotificationCountDocument, variables: { scope: 'STOREFRONT' } },
          result: { data: { notificationUnreadCount: 0 } },
        },
      ]}
    >
      <NotificationProvider scope="STOREFRONT">
        <Probe />
      </NotificationProvider>
    </MockedProvider>
  )
  const view = render(tree)
  await waitFor(() => expect(fixtures.connect).toHaveBeenCalledTimes(1))
  // Wait for the first request's coalescing window, then change identity before its response.
  await new Promise((resolve) => setTimeout(resolve, 300))
  fixtures.session = { user: { id: 'reader-b', emailVerified: true } }
  view.rerender(
    <MockedProvider>
      <NotificationProvider scope="STOREFRONT">
        <Probe />
      </NotificationProvider>
    </MockedProvider>,
  )
  expect(screen.getByText('unknown')).toBeTruthy()
  expect(await screen.findByText('0')).toBeTruthy()
  await new Promise((resolve) => setTimeout(resolve, 500))
  expect(screen.queryByText('777')).toBeNull()
  expect(close).toHaveBeenCalledTimes(1)
})

it('does not repopulate the private Apollo cache from a late read mutation after account change', async () => {
  const cache = new InMemoryCache()
  const mocks = [
    {
      request: { query: NotificationCountDocument, variables: { scope: 'STOREFRONT' } },
      result: { data: { notificationUnreadCount: 1 } },
      maxUsageCount: 10,
    },
    {
      request: {
        query: ReadNotificationDocument,
        variables: { scope: 'STOREFRONT', id: 'private-old' },
      },
      delay: 600,
      result: {
        data: {
          markNotificationRead: {
            __typename: 'InAppNotification',
            id: 'private-old',
            kind: 'PAYMENT_CONFIRMED',
            scope: 'STOREFRONT',
            createdAt: '2026-10-20T00:00:00.000Z',
            readAt: '2026-10-20T01:00:00.000Z',
            resourceType: 'ORDER',
            resourceId: '12',
            bookTitle: null,
            stockAtEvent: null,
            refundPhase: null,
            testPayment: true,
          },
        },
      },
    },
  ]
  const tree = () => (
    <MockedProvider cache={cache} mocks={mocks}>
      <NotificationProvider scope="STOREFRONT">
        <Probe />
      </NotificationProvider>
    </MockedProvider>
  )
  const view = render(tree())
  await screen.findByText('1')
  fireEvent.click(screen.getByText('Read one'))
  await new Promise((resolve) => setTimeout(resolve, 100))
  fixtures.session = { user: { id: 'reader-b', emailVerified: true } }
  cache.restore({})
  view.rerender(tree())
  await new Promise((resolve) => setTimeout(resolve, 700))
  expect(JSON.stringify(cache.extract())).not.toContain('private-old')
})

it('ignores a pre-read count response that arrives after a newer post-read count', async () => {
  render(
    <MockedProvider
      mocks={[
        {
          request: { query: NotificationCountDocument, variables: { scope: 'STOREFRONT' } },
          result: { data: { notificationUnreadCount: 1 } },
        },
        {
          request: { query: NotificationCountDocument, variables: { scope: 'STOREFRONT' } },
          delay: 600,
          result: { data: { notificationUnreadCount: 9 } },
        },
        {
          request: { query: NotificationCountDocument, variables: { scope: 'STOREFRONT' } },
          result: { data: { notificationUnreadCount: 0 } },
        },
        {
          request: { query: ReadAllNotificationsDocument, variables: { scope: 'STOREFRONT' } },
          result: { data: { markAllNotificationsRead: { changedCount: 1 } } },
        },
      ]}
    >
      <NotificationProvider scope="STOREFRONT">
        <Probe />
      </NotificationProvider>
    </MockedProvider>,
  )
  await screen.findByText('1')
  fireEvent.click(screen.getByText('Refresh'))
  fireEvent.click(screen.getByText('Read all'))
  await screen.findByText('0')
  await new Promise((resolve) => setTimeout(resolve, 650))
  expect(screen.getByText('0')).toBeTruthy()
  expect(screen.queryByText('9')).toBeNull()
})
