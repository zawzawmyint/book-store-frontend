// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { render, cleanup, waitFor } from '@testing-library/react'
import { ApolloClient, ApolloLink, InMemoryCache } from '@apollo/client'
import { ApolloProvider } from '@apollo/client/react'
import { Observable } from 'rxjs'
import { MemoryRouter } from 'react-router-dom'
import { CartSession } from './CartSession'
import { useCartStore } from './cart-store'
const auth = vi.hoisted(() => ({
  refetch: vi.fn(),
  getSession: vi.fn(async () => ({ data: { user: { id: 'B', emailVerified: true } } })),
}))
vi.mock('../../lib/auth-client', () => ({
  authClient: { getSession: auth.getSession, useSession: () => ({ refetch: auth.refetch }) },
}))
afterEach(() => {
  cleanup()
  auth.refetch.mockClear()
  auth.getSession.mockClear()
})
it('never renders the prior cart under a newly resolved account, even before effects run', async () => {
  useCartStore.setState({
    owner: 'A',
    status: 'ready',
    items: [
      {
        id: '1',
        title: 'A private book',
        author: 'Author',
        genre: 'Fiction',
        stock: 2,
        quantity: 1,
        priceCents: 100,
      },
    ],
  })
  const painted: string[] = []
  function Child() {
    painted.push(
      useCartStore
        .getState()
        .items.map((item) => item.title)
        .join(','),
    )
    return <p>Bag content</p>
  }
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink(() => new Observable(() => {})),
  })
  render(
    <ApolloProvider client={client}>
      <MemoryRouter>
        <CartSession owner="B">
          <Child />
        </CartSession>
      </MemoryRouter>
    </ApolloProvider>,
  )
  expect(painted).not.toContain('A private book')
})
it('binds the API request to the expected account and hides data after an authoritative mismatch', async () => {
  useCartStore.setState({ owner: null, status: 'guest', items: [] })
  const headers: unknown[] = []
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink(
      (operation) =>
        new Observable((observer) => {
          headers.push(operation.getContext().headers)
          observer.next({
            errors: [{ message: 'Session changed', extensions: { code: 'UNAUTHENTICATED' } }],
          })
          observer.complete()
        }),
    ),
  })
  render(
    <ApolloProvider client={client}>
      <MemoryRouter>
        <CartSession owner="B">
          <p>Bag content</p>
        </CartSession>
      </MemoryRouter>
    </ApolloProvider>,
  )
  await waitFor(() => expect(auth.refetch).toHaveBeenCalled())
  expect(headers).toEqual([{ 'X-Cart-Account': 'B' }])
  expect(useCartStore.getState().owner).toBeUndefined()
  expect(useCartStore.getState().items).toEqual([])
})
