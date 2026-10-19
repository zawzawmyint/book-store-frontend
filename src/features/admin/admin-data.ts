import type { ApolloClient } from '@apollo/client'

export const ADMIN_PAGE_SIZE = 5

export function patchAdminParams(params: URLSearchParams, values: Record<string, string>) {
  const next = new URLSearchParams(params)
  for (const [key, value] of Object.entries(values)) {
    if (value) next.set(key, value)
    else next.delete(key)
  }
  return next
}

export async function refreshCatalog(client: ApolloClient) {
  client.cache.evict({ fieldName: 'books' })
  client.cache.evict({ fieldName: 'book' })
  client.cache.evict({ fieldName: 'genres' })
  client.cache.evict({ fieldName: 'bookCovers' })
  client.cache.gc()
  await client.refetchQueries({
    include: Array.from(client.getObservableQueries().values())
      .filter((query) =>
        [
          'Books',
          'Book',
          'StorefrontHome',
          'RelatedBooks',
          'BookCovers',
          'MyCart',
          'AdminBook',
          'AdminBooks',
        ].includes(query.queryName ?? ''),
      )
      .map((query) => query.query),
  })
}

export function readPage(value: string | null) {
  if (!value || !/^[1-9]\d*$/.test(value)) return 1
  const page = Number(value)
  return Number.isSafeInteger(page) && (page - 1) * ADMIN_PAGE_SIZE <= 2147483647 ? page : 1
}
