import { useCallback, useEffect, useRef, useState } from 'react'
import { useApolloClient, useQuery } from '@apollo/client/react'
import { useLocation } from 'react-router-dom'
import { ViewerDocument } from '../../generated/graphql'
import { authClient } from '../../lib/auth-client'
import { accessErrorCode, AccessContext } from './admin-access'

export function AdminAccessProvider({ children }: { children: React.ReactNode }) {
  const { data: session, isPending, refetch: refreshSession } = authClient.useSession()
  const { pathname } = useLocation()
  const client = useApolloClient()
  const { data, loading, error, refetch } = useQuery(ViewerDocument, {
    skip: !session?.user || isPending,
    fetchPolicy: 'no-cache',
    notifyOnNetworkStatusChange: true,
  })
  const [blocked, setBlocked] = useState<string>()
  const previousPath = useRef(pathname)
  const previousRole = useRef<string | undefined>(undefined)
  const handleError = useCallback(
    (failure: unknown) => {
      const code = accessErrorCode(failure)
      if (code) {
        setBlocked(code)
        void client.clearStore()
        if (code === 'UNAUTHENTICATED') void refreshSession({ query: { disableCookieCache: true } })
      }
    },
    [client, refreshSession],
  )
  const retry = useCallback(() => {
    if (blocked === 'UNAUTHENTICATED' || data?.viewer === null) {
      void refreshSession({ query: { disableCookieCache: true } })
      return
    }
    setBlocked(undefined)
    void refetch().catch(() => {})
  }, [refetch, refreshSession, blocked, data?.viewer])
  useEffect(() => {
    if (pathname !== previousPath.current && pathname.startsWith('/admin') && session?.user) retry()
    previousPath.current = pathname
  }, [pathname, session?.user, retry])
  useEffect(() => {
    if (!session?.user) return
    window.addEventListener('focus', retry)
    return () => window.removeEventListener('focus', retry)
  }, [session?.user, retry])
  useEffect(() => {
    if (loading || !data) return
    if (data.viewer === null && session?.user)
      void refreshSession({ query: { disableCookieCache: true } })
    if (previousRole.current === 'ADMIN' && data.viewer?.role !== 'ADMIN') void client.clearStore()
    previousRole.current = data.viewer?.role
  }, [data, loading, session?.user, client, refreshSession])
  return (
    <AccessContext.Provider
      value={{
        role: blocked === 'FORBIDDEN' ? 'CUSTOMER' : data?.viewer?.role,
        loading: isPending || loading,
        error,
        expired:
          blocked === 'UNAUTHENTICATED' || (!loading && !!session?.user && data?.viewer === null),
        retry,
        handleError,
      }}
    >
      {children}
    </AccessContext.Provider>
  )
}
