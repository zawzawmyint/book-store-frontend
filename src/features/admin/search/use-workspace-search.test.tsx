// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { act, cleanup, renderHook } from '@testing-library/react'
import { ApolloClient, ApolloLink, InMemoryCache, Observable } from '@apollo/client'
import { ApolloProvider } from '@apollo/client/react'
import { WorkspaceSearchBooksDocument } from '../../../generated/graphql'
import { useWorkspaceSearch } from './use-workspace-search'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})
function transport() {
  const pending: { term: string; deliver: (title: string) => void }[] = []
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink(
      (operation) =>
        new Observable((observer) => {
          pending.push({
            term: operation.variables.search,
            deliver: (title) => {
              observer.next({
                data: {
                  adminBooks: { total: 1, items: [{ id: '1', title, author: 'Author', stock: 1 }] },
                },
              })
              observer.complete()
            },
          })
        }),
    ),
  })
  return {
    pending,
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <ApolloProvider client={client}>{children}</ApolloProvider>
    ),
  }
}
const close = () => {}
it('does not send a Books request for a one-digit order lookup', async () => {
  vi.useFakeTimers()
  const { wrapper, pending } = transport()
  renderHook(() => useWorkspaceSearch(WorkspaceSearchBooksDocument, '2', close), { wrapper })
  await act(async () => vi.advanceTimersByTimeAsync(300))
  expect(pending).toHaveLength(0)
})
it('debounces qualifying input and prevents an older term response replacing the current result', async () => {
  vi.useFakeTimers()
  const { wrapper, pending } = transport()
  const view = renderHook(
    ({ term }) => useWorkspaceSearch(WorkspaceSearchBooksDocument, term, close),
    { initialProps: { term: 'a' }, wrapper },
  )
  await act(async () => vi.advanceTimersByTimeAsync(300))
  expect(pending).toHaveLength(0)
  view.rerender({ term: 'old' })
  await act(async () => vi.advanceTimersByTimeAsync(250))
  view.rerender({ term: 'new' })
  expect(view.result.current.data).toBeUndefined()
  await act(async () => vi.advanceTimersByTimeAsync(250))
  await act(async () => pending[1].deliver('Current result'))
  await act(async () => pending[0].deliver('Old result'))
  expect(view.result.current.data?.adminBooks.items[0].title).toBe('Current result')
})
it('starts a fresh request after closing and reopening for the same term', async () => {
  vi.useFakeTimers()
  const { wrapper, pending } = transport()
  const first = renderHook(() => useWorkspaceSearch(WorkspaceSearchBooksDocument, 'same', close), {
    wrapper,
  })
  await act(async () => vi.advanceTimersByTimeAsync(250))
  first.unmount()
  const reopened = renderHook(
    () => useWorkspaceSearch(WorkspaceSearchBooksDocument, 'same', close),
    { wrapper },
  )
  await act(async () => vi.advanceTimersByTimeAsync(250))
  expect(pending).toHaveLength(2)
  await act(async () => pending[0].deliver('Before close'))
  expect(reopened.result.current.data).toBeUndefined()
  await act(async () => pending[1].deliver('After reopen'))
  expect(reopened.result.current.data?.adminBooks.items[0].title).toBe('After reopen')
})
