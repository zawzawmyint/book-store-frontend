import { useState, type FormEvent } from 'react'
import { useQuery } from '@apollo/client/react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { BooksDocument } from '../../generated/graphql'
import { PAGE_SIZE } from './catalog'

export function useCatalog() {
  const [params, setParams] = useSearchParams()
  const search = params.get('search') || ''
  const page = Math.max(0, Number(params.get('page') || 0) || 0)
  const { state, key } = useLocation()
  const headerKey = state?.fromStoreSearch ? key : null
  const [searchDraft, setSearchDraft] = useState({ value: search, headerKey })
  // A header search starts a new search even when this catalog stays mounted.
  // Catalog-owned navigation retains its existing unsent-draft/history behavior.
  if (headerKey !== null && searchDraft.headerKey !== headerKey)
    setSearchDraft({ value: search, headerKey })
  const draft = searchDraft.value
  const setDraft = (value: string) => setSearchDraft((current) => ({ ...current, value }))
  const { data, loading, error, refetch } = useQuery(BooksDocument, {
    variables: { search, limit: PAGE_SIZE, offset: page * PAGE_SIZE },
  })

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = draft.trim()
    setParams(value ? { search: value } : {})
  }

  function chooseCategory(category: string) {
    const value = category === 'All books' ? '' : category
    setDraft(value)
    setParams(value ? { search: value } : {})
  }

  function changePage(nextPage: number) {
    setParams(search ? { search, page: String(nextPage) } : { page: String(nextPage) })
  }

  return {
    search,
    page,
    draft,
    setDraft,
    books: data?.books.items || [],
    categories: ['All books', ...(data?.genres || [])],
    total: data?.books.total,
    loading,
    error,
    refetch,
    submitSearch,
    chooseCategory,
    changePage,
  }
}
