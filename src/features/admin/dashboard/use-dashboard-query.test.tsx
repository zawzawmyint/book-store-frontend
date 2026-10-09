// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import {
  ApolloClient,
  ApolloLink,
  InMemoryCache,
  Observable,
  gql,
  type TypedDocumentNode,
} from '@apollo/client'
import { ApolloProvider } from '@apollo/client/react'
import type { ReactNode } from 'react'
import { useDashboardQuery } from './use-dashboard-query'

afterEach(cleanup)
const document = gql`
  query Probe {
    workspaceDashboard {
      lowStockCount
    }
  }
` as TypedDocumentNode<{ workspaceDashboard: { lowStockCount: number } }, Record<string, never>>
const variables = {}
function setup() {
  const requests: { succeed: (count: number) => void; fail: () => void }[] = []
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink(
      () =>
        new Observable((observer) => {
          requests.push({
            succeed: (count) => {
              observer.next({ data: { workspaceDashboard: { lowStockCount: count } } })
              observer.complete()
            },
            fail: () => observer.error(new Error('Network unavailable')),
          })
        }),
    ),
  })
  const hook = renderHook(() => useDashboardQuery(document, variables, 0), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <ApolloProvider client={client}>{children}</ApolloProvider>
    ),
  })
  return { ...hook, requests }
}
it('fetches fresh stock after a write even when an earlier snapshot remains in flight', async () => {
  const { result, requests } = setup()
  await waitFor(() => expect(requests).toHaveLength(1))
  let refreshed!: Promise<void>
  act(() => {
    refreshed = result.current.refresh(true)
  })
  await act(async () => {
    requests[0].succeed(5)
  })
  await waitFor(() => expect(requests).toHaveLength(2))
  await act(async () => {
    requests[1].succeed(4)
    await refreshed
  })
  expect(result.current.data?.workspaceDashboard.lowStockCount).toBe(4)
})
it('deduplicates ordinary refresh and retains explicitly stale data on failure', async () => {
  const { result, requests } = setup()
  await waitFor(() => expect(requests).toHaveLength(1))
  act(() => {
    void result.current.refresh()
    void result.current.refresh()
  })
  expect(requests).toHaveLength(1)
  await act(async () => {
    requests[0].succeed(3)
  })
  act(() => {
    void result.current.refresh()
  })
  await waitFor(() => expect(requests).toHaveLength(2))
  await act(async () => {
    requests[1].fail()
  })
  expect(result.current.error?.message).toBe('Network unavailable')
  expect(result.current.data?.workspaceDashboard.lowStockCount).toBe(3)
  expect(result.current.loading).toBe(false)
})
