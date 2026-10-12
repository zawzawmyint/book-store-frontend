import { useState, type FormEvent } from 'react'
import { useQuery } from '@apollo/client/react'
import { useSearchParams } from 'react-router-dom'
import { BooksDocument } from '../../generated/graphql'
import { PAGE_SIZE } from './catalog'

export function useCatalog() {
  const [params, setParams] = useSearchParams()
  const search = params.get('search') || ''
  const page = Math.max(0, Number(params.get('page') || 0) || 0)
  const [draft, setDraft] = useState(search)
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
