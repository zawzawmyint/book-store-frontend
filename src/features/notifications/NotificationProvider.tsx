import { NotificationContext, type InboxScope } from './notification-context'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useApolloClient } from '@apollo/client/react'
import {
  NotificationCountDocument,
  ReadAllNotificationsDocument,
  ReadNotificationDocument,
  ViewerDocument,
} from '../../generated/graphql'
import { authClient } from '../../lib/auth-client'
import { useAdminAccess } from '../admin/admin-access'
import { createRefreshScheduler } from './refresh-scheduler'
import { connectNotificationStream } from './notification-stream'

function errorCode(error: unknown): string | undefined {
  const entries = (error as { errors?: { extensions?: { code?: string } }[] } | null)?.errors
  return entries
    ?.map((entry) => entry.extensions?.code)
    .find((code) => ['NOTIFICATIONS_DISABLED', 'UNAUTHENTICATED', 'FORBIDDEN'].includes(code ?? ''))
}
export function NotificationProvider({
  scope,
  children,
}: {
  scope: InboxScope
  children: React.ReactNode
}) {
  const { data: session, refetch: refreshSession } = authClient.useSession()
  const client = useApolloClient()
  const access = useAdminAccess()
  const userId = session?.user.emailVerified === true ? session.user.id : undefined
  const allowed =
    import.meta.env.VITE_IN_APP_NOTIFICATIONS_ENABLED === 'true' &&
    !!userId &&
    (scope === 'STOREFRONT' || access.role === 'ADMIN' || access.role === 'STAFF')
  // Role belongs to the identity key so an Admin → Staff change drops privileged rows immediately.
  return (
    <ActiveInbox
      key={`${userId}:${scope}:${access.role}`}
      scope={scope}
      allowed={allowed}
      refreshSession={async () => {
        const current = await authClient.getSession({ query: { disableCookieCache: true } })
        if (current.data?.user.id !== userId || current.data?.user.emailVerified !== true) {
          await refreshSession({ query: { disableCookieCache: true } })
          return false
        }
        if (scope === 'WORKSPACE') {
          const result = await client.query({ query: ViewerDocument, fetchPolicy: 'no-cache' })
          access.retry()
          return result.data?.viewer?.role === 'ADMIN' || result.data?.viewer?.role === 'STAFF'
        }
        return true
      }}
      handleAccessError={access.handleError}
    >
      {children}
    </ActiveInbox>
  )
}
function ActiveInbox({
  scope,
  allowed,
  children,
  refreshSession,
  handleAccessError,
}: {
  scope: InboxScope
  allowed: boolean
  children: React.ReactNode
  refreshSession: () => Promise<boolean>
  handleAccessError: (error: unknown) => void
}) {
  const client = useApolloClient()
  const [disabled, setDisabled] = useState(false)
  const [count, setCount] = useState<number>()
  const [error, setError] = useState(false)
  const [pending, setPending] = useState(false)
  const mounted = useRef(true)
  const refreshGeneration = useRef(0)
  const lists = useRef(new Set<() => Promise<unknown>>())
  const callbacks = useRef({ refreshSession, handleAccessError })
  useEffect(() => {
    callbacks.current = { refreshSession, handleAccessError }
  }, [refreshSession, handleAccessError])
  const enabled = allowed && !disabled
  const handleError = useCallback((failure: unknown) => {
    if (!mounted.current) return
    const code = errorCode(failure)
    if (code === 'NOTIFICATIONS_DISABLED') {
      setDisabled(true)
      setCount(undefined)
    } else if (code === 'FORBIDDEN' || code === 'UNAUTHENTICATED') {
      setDisabled(true)
      setCount(undefined)
      callbacks.current.handleAccessError(failure)
      void callbacks.current.refreshSession().catch(() => {})
    } else setError(true)
  }, [])
  const refresh = useCallback(async () => {
    if (!enabled || !mounted.current) return
    const generation = ++refreshGeneration.current
    try {
      const result = await client.query({
        query: NotificationCountDocument,
        variables: { scope },
        fetchPolicy: 'no-cache',
        context: { queryDeduplication: false },
      })
      if (!mounted.current || generation !== refreshGeneration.current) return
      if (result.error) throw result.error
      if (result.data) setCount(result.data.notificationUnreadCount)
      setError(false)
      await Promise.allSettled([...lists.current].map((fetch) => fetch()))
    } catch (failure) {
      if (generation === refreshGeneration.current) handleError(failure)
    }
  }, [client, enabled, scope, handleError])
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      refreshGeneration.current += 1
    }
  }, [])
  useEffect(() => {
    if (!enabled) return
    const scheduler = createRefreshScheduler(refresh)
    scheduler.schedule()
    const disconnect = connectNotificationStream({
      scope,
      refresh: scheduler.schedule,
      revalidate: () => callbacks.current.refreshSession(),
    })
    return () => {
      disconnect()
      scheduler.dispose()
    }
  }, [enabled, refresh, scope])
  const register = useCallback((fetch: () => Promise<unknown>) => {
    lists.current.add(fetch)
    return () => {
      lists.current.delete(fetch)
    }
  }, [])
  async function markRead(id?: string) {
    if (!enabled || pending) return false
    setPending(true)
    try {
      if (id)
        await client.mutate({
          mutation: ReadNotificationDocument,
          variables: { scope, id },
          fetchPolicy: 'no-cache',
        })
      else
        await client.mutate({
          mutation: ReadAllNotificationsDocument,
          variables: { scope },
          fetchPolicy: 'no-cache',
        })
      if (!mounted.current) return false
      await refresh()
      return true
    } catch (failure) {
      handleError(failure)
      return false
    } finally {
      if (mounted.current) setPending(false)
    }
  }
  return (
    <NotificationContext.Provider
      value={{ scope, enabled, count, error, pending, refresh, handleError, register, markRead }}
    >
      {children}
    </NotificationContext.Provider>
  )
}
