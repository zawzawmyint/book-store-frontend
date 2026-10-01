import { useEffect, useState } from 'react'
import { useApolloClient } from '@apollo/client/react'
import { authClient } from '../lib/auth-client'

/** Unmounts routed content until Apollo data is cleared for the current identity. */
export function SessionBoundary({ children }: { children: React.ReactNode }) {
  const { data, isPending } = authClient.useSession()
  const client = useApolloClient()
  const userId = data?.user.id ?? null
  const [readyId, setReadyId] = useState<string | null | undefined>(undefined)

  useEffect(() => {
    if (isPending || readyId === userId) return
    let active = true
    void client.clearStore().then(() => {
      if (active) setReadyId(userId)
    })
    return () => { active = false }
  }, [client, isPending, readyId, userId])

  if (isPending || readyId !== userId) {
    return <div role="status" className="py-24 text-center">Loading your account…</div>
  }
  return children
}
