// @vitest-environment jsdom
import { cleanup, renderHook, waitFor } from '@testing-library/react'
import { ApolloClient, ApolloLink, InMemoryCache, Observable } from '@apollo/client'
import { ApolloProvider } from '@apollo/client/react'
import { afterEach, expect, it } from 'vitest'
import { useCartCovers } from './use-cart-covers'
import type { CartItem } from './cart'
afterEach(cleanup)
const item = (id: string): CartItem => ({
  id,
  title: `Book ${id}`,
  author: 'Author',
  genre: 'Fiction',
  priceCents: 100,
  stock: 3,
  quantity: 1,
})
it('batches optional guest cover lookups and leaves persisted guest data untouched', async () => {
  localStorage.setItem('book-store-cart', 'original guest envelope')
  const batches: string[][] = []
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink(
      (operation) =>
        new Observable((observer) => {
          batches.push(operation.variables.ids)
          observer.next({
            data: {
              bookCovers: operation.variables.ids.map((id: string) => ({
                id,
                cover: { url: `https://images.test/${id}.webp`, width: 800, height: 1200 },
              })),
            },
          })
          observer.complete()
        }),
    ),
  })
  const items = Array.from({ length: 101 }, (_, index) => item(String(index + 1)))
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <ApolloProvider client={client}>{children}</ApolloProvider>
  )
  const { result } = renderHook(() => useCartCovers(items, null), { wrapper })
  await waitFor(() => expect(result.current.get('101')?.url).toContain('/101.webp'))
  expect(batches.map((batch) => batch.length)).toEqual([50, 50, 1])
  expect(localStorage.getItem('book-store-cart')).toBe('original guest envelope')
})
it('uses live account metadata and degrades a failed guest lookup to fallback', async () => {
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink(
      () => new Observable((observer) => observer.error(new Error('Catalog unavailable'))),
    ),
  })
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <ApolloProvider client={client}>{children}</ApolloProvider>
  )
  const items = [
    { ...item('1'), cover: { url: 'https://images.test/live.webp', width: 800, height: 1200 } },
  ]
  const { result, rerender } = renderHook(
    ({ owner }: { owner: string | null }) => useCartCovers(items, owner),
    { initialProps: { owner: 'reader' as string | null }, wrapper },
  )
  expect(result.current.get('1')?.url).toContain('/live.webp')
  rerender({ owner: null })
  await waitFor(() => expect(result.current.get('1')).toBeNull())
})
it('refreshes a guest cover on remount after another staff session changes it', async () => {
  let version = 'first'
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink(
      () =>
        new Observable((observer) => {
          observer.next({
            data: {
              bookCovers: [
                {
                  id: '1',
                  cover: { url: `https://images.test/${version}.webp`, width: 800, height: 1200 },
                },
              ],
            },
          })
          observer.complete()
        }),
    ),
  })
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <ApolloProvider client={client}>{children}</ApolloProvider>
  )
  const items = [item('1')]
  const first = renderHook(() => useCartCovers(items, null), { wrapper })
  await waitFor(() => expect(first.result.current.get('1')?.url).toContain('/first.webp'))
  first.unmount()
  version = 'replacement'
  const second = renderHook(() => useCartCovers(items, null), { wrapper })
  await waitFor(() => expect(second.result.current.get('1')?.url).toContain('/replacement.webp'))
})
