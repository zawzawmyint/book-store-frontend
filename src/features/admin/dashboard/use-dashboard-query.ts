import { useCallback, useEffect, useRef, useState } from 'react'
import { useApolloClient } from '@apollo/client/react'
import type { OperationVariables, TypedDocumentNode } from '@apollo/client'
import { accessErrorCode, useAdminAccess } from '../admin-access'

// Each period is mounted with its own key. An unmounted request cannot publish
// data into a later period or a viewer whose role has changed.
export function useDashboardQuery<TData, TVariables extends OperationVariables>(
  query: TypedDocumentNode<TData, TVariables>,
  variables: TVariables,
  refreshKey: number,
) {
  const client = useApolloClient()
  const { handleError } = useAdminAccess()
  const [state, setState] = useState<{ data?: TData; loading: boolean; error?: Error }>({
    loading: true,
  })
  const generation = useRef(0)
  const pending = useRef<Promise<void> | undefined>(undefined)
  const refresh = useCallback(
    function refresh(afterWrite = false): Promise<void> {
      if (pending.current) {
        if (!afterWrite) return pending.current
        const token = generation.current
        return pending.current.then(() => {
          if (token === generation.current) return refresh()
        })
      }
      const token = generation.current
      setState((previous) => ({ ...previous, loading: true, error: undefined }))
      const request = client
        .query({ query, variables, fetchPolicy: 'no-cache' })
        .then((result) => {
          if (token === generation.current) setState({ data: result.data as TData, loading: false })
        })
        .catch((failure: unknown) => {
          if (token !== generation.current) return
          handleError(failure)
          setState((previous) => ({
            data: accessErrorCode(failure) ? undefined : previous.data,
            loading: false,
            error: failure instanceof Error ? failure : new Error('Unable to load dashboard'),
          }))
        })
        .finally(() => {
          if (pending.current === request) pending.current = undefined
        })
      pending.current = request
      return request
    },
    [client, query, variables, handleError],
  )
  useEffect(() => {
    void refresh()
    const onFocus = () => {
      void refresh()
    }
    window.addEventListener('focus', onFocus)
    return () => {
      generation.current += 1
      pending.current = undefined
      window.removeEventListener('focus', onFocus)
    }
  }, [refresh])
  useEffect(() => {
    void refresh()
  }, [refreshKey, refresh])
  return { ...state, refresh }
}
