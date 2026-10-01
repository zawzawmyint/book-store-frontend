// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { ApolloClient, ApolloLink, InMemoryCache, gql } from '@apollo/client'
import { ApolloProvider, useApolloClient } from '@apollo/client/react'
import { SessionBoundary } from './SessionBoundary'

const session = vi.hoisted(() => ({ userId: 'A' as string | null, pending: false }))
vi.mock('../lib/auth-client', () => ({
  authClient: { useSession: () => ({ data: session.userId ? { user: { id: session.userId } } : null, isPending: session.pending }) },
}))

const accountQuery = gql`query AccountOrders { accountOrders { title } }`

function ProtectedOrders() {
  const client = useApolloClient()
  const data = client.cache.readQuery<{ accountOrders: { title: string }[] }>({ query: accountQuery })
  return <div>{data?.accountOrders.map((order) => order.title).join(', ') || 'No cached orders'}</div>
}

afterEach(() => {
  cleanup()
  session.userId = 'A'
  session.pending = false
})

describe('session data boundary', () => {
  it('unmounts protected content and clears cached orders when the session changes A → B → signed out', async () => {
    const client = new ApolloClient({ cache: new InMemoryCache(), link: ApolloLink.empty() })
    const view = () => <ApolloProvider client={client}><SessionBoundary><ProtectedOrders /></SessionBoundary></ApolloProvider>
    const { rerender } = render(view())
    await screen.findByText('No cached orders')
    client.cache.writeQuery({ query: accountQuery, data: { accountOrders: [{ title: 'A private order' }] } })
    rerender(view())
    expect(screen.getByText('A private order')).toBeTruthy()

    session.pending = true
    rerender(view())
    expect(screen.queryByText('A private order')).toBeNull()
    session.pending = false
    session.userId = 'B'
    rerender(view())
    expect(screen.queryByText('A private order')).toBeNull()
    await waitFor(() => expect(client.cache.readQuery({ query: accountQuery })).toBeNull())
    await screen.findByText('No cached orders')
    client.cache.writeQuery({ query: accountQuery, data: { accountOrders: [{ title: 'B private order' }] } })
    rerender(view())
    expect(screen.getByText('B private order')).toBeTruthy()

    session.userId = null
    rerender(view())
    expect(screen.queryByText('B private order')).toBeNull()
    await waitFor(() => expect(client.cache.readQuery({ query: accountQuery })).toBeNull())
  })
})
