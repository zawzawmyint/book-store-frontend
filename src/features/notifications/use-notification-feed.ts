import { useCallback, useEffect, useRef, useState } from 'react'
import { useApolloClient } from '@apollo/client/react'
import { NotificationFeedDocument, type NotificationFieldsFragment } from '../../generated/graphql'
import { useNotifications } from './notification-context'

export function useNotificationFeed(first: number, unreadOnly = false) {
  const client = useApolloClient()
  const { scope, enabled, register, handleError } = useNotifications()
  const [nodes, setNodes] = useState<NotificationFieldsFragment[]>([])
  const [page, setPage] = useState({ endCursor: null as string | null, hasNextPage: false })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [replaced, setReplaced] = useState(false)
  const generation = useRef(0)
  const hasOlder = useRef(false)
  const fetch = useCallback(
    async (after?: string) => {
      if (!enabled) return
      const request = ++generation.current
      setLoading(true)
      try {
        const result = await client.query({
          query: NotificationFeedDocument,
          variables: { scope, first, unreadOnly, after },
          fetchPolicy: 'no-cache',
          context: { queryDeduplication: false },
        })
        if (request !== generation.current) return
        if (result.error) throw result.error
        if (!result.data) throw new Error('Missing notification data')
        const connection = result.data.notifications
        for (const node of connection.nodes) {
          if (
            node.scope !== scope ||
            !['ORDER', 'BOOK'].includes(node.resourceType) ||
            (node.resourceType === 'BOOK' && scope !== 'WORKSPACE')
          )
            throw new Error('Invalid notification scope or resource')
        }
        setNodes((previous) =>
          after
            ? [
                ...previous,
                ...connection.nodes.filter((node) => !previous.some((old) => old.id === node.id)),
              ]
            : connection.nodes,
        )
        setPage({
          endCursor: connection.pageInfo.endCursor ?? null,
          hasNextPage: connection.pageInfo.hasNextPage,
        })
        if (!after && hasOlder.current) setReplaced(true)
        hasOlder.current = !!after
        setError(false)
      } catch (failure) {
        if (request === generation.current) {
          setError(true)
          handleError(failure)
        }
      } finally {
        if (request === generation.current) setLoading(false)
      }
    },
    [client, enabled, first, unreadOnly, scope, handleError],
  )
  const refresh = useCallback(() => fetch(), [fetch])
  useEffect(() => {
    let active = true
    queueMicrotask(() => {
      if (active) void refresh()
    })
    const unregister = register(refresh)
    return () => {
      active = false
      generation.current += 1
      unregister()
    }
  }, [refresh, register])
  return {
    nodes,
    loading,
    error,
    replaced,
    refresh,
    hasNextPage: page.hasNextPage,
    loadMore: () => fetch(page.endCursor ?? undefined),
  }
}
