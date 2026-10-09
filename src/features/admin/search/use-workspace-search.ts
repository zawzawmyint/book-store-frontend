import { useEffect, useRef, useState } from 'react'
import { useApolloClient } from '@apollo/client/react'
import type { TypedDocumentNode } from '@apollo/client'
import { accessErrorCode, useAdminAccess } from '../admin-access'

export function useWorkspaceSearch<TData>(
  query: TypedDocumentNode<TData, { search: string }>,
  term: string,
  onDenied: () => void,
  allowSingleDigit = false,
) {
  const client = useApolloClient()
  const { handleError } = useAdminAccess()
  const generation = useRef(0)
  const [retryKey, setRetryKey] = useState(0)
  const [state, setState] = useState<{
    term: string
    data?: TData
    error?: Error
    loading: boolean
  }>({ term: '', loading: false })
  const eligible = term.length >= 2 || (allowSingleDigit && /^\d$/.test(term))
  useEffect(() => {
    const token = ++generation.current
    if (!eligible) return
    const timer = window.setTimeout(() => {
      setState({ term, loading: true })
      void client
        .query({
          query,
          variables: { search: term },
          fetchPolicy: 'no-cache',
          context: { queryDeduplication: false },
        })
        .then((result) => {
          if (generation.current === token)
            setState({ term, data: result.data as TData, loading: false })
        })
        .catch((failure: unknown) => {
          if (generation.current !== token) return
          if (accessErrorCode(failure)) {
            onDenied()
            handleError(failure)
          } else
            setState({
              term,
              loading: false,
              error: failure instanceof Error ? failure : new Error('Search failed'),
            })
        })
    }, 250)
    return () => {
      window.clearTimeout(timer)
      generation.current = token + 1
    }
  }, [client, query, term, eligible, retryKey, handleError, onDenied])
  return {
    ...(eligible && state.term === term ? state : { term, loading: eligible }),
    eligible,
    retry: () => setRetryKey((key) => key + 1),
  }
}
