import type { ApolloClient } from '@apollo/client'

export async function refreshCatalog(client: ApolloClient) {
  client.cache.evict({ fieldName: 'books' })
  client.cache.evict({ fieldName: 'book' })
  client.cache.evict({ fieldName: 'genres' })
  client.cache.gc()
  await client.refetchQueries({
    include: Array.from(client.getObservableQueries().values())
      .filter((query) => ['Books', 'Book'].includes(query.queryName ?? ''))
      .map((query) => query.query),
  })
}

export function readPage(value: string | null) {
  if (!value || !/^[1-9]\d*$/.test(value)) return 1
  const page = Number(value)
  return Number.isSafeInteger(page) && (page - 1) * 20 <= 2147483647 ? page : 1
}
