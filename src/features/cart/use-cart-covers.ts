import { useEffect, useState } from 'react'
import { useApolloClient } from '@apollo/client/react'
import { BookCoversDocument } from '../../generated/graphql'
import type { CartItem } from './cart'
import type { CoverImage } from '../books/components/BookCover'
export function useCartCovers(items: CartItem[], owner: string | null | undefined) {
  const client = useApolloClient(),
    [lookedUp, setLookedUp] = useState(new Map<string, CoverImage | null>())
  const idsKey = owner
    ? ''
    : items
        .map((item) => item.id)
        .sort()
        .join(',')
  useEffect(() => {
    let active = true
    if (!idsKey) return
    const ids = idsKey.split(',')
    void Promise.all(
      Array.from({ length: Math.ceil(ids.length / 50) }, (_, index) =>
        client.query({
          query: BookCoversDocument,
          variables: { ids: ids.slice(index * 50, (index + 1) * 50) },
          fetchPolicy: 'network-only',
        }),
      ),
    )
      .then((results) => {
        if (active)
          setLookedUp(
            new Map(
              results.flatMap(
                (result) =>
                  result.data?.bookCovers.map((book) => [book.id, book.cover ?? null] as const) ??
                  [],
              ),
            ),
          )
      })
      .catch(() => {
        if (active) setLookedUp(new Map())
      })
    return () => {
      active = false
    }
  }, [client, idsKey])
  return new Map(
    items.map((item) => [item.id, owner ? (item.cover ?? null) : (lookedUp.get(item.id) ?? null)]),
  )
}
