import { useEffect, useState, type FormEvent } from 'react'
import { useQuery } from '@apollo/client/react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { BooksDocument, type CatalogSort } from '../../generated/graphql'
import { PAGE_SIZE, catalogParams, parseCatalog, type CatalogState } from './catalog'

const sorts: Record<CatalogState['sort'], CatalogSort> = {
  default: 'DEFAULT',
  'title-asc': 'TITLE_ASC',
  'price-asc': 'PRICE_ASC',
  'price-desc': 'PRICE_DESC',
}
export function useCatalog() {
  const [params, setParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const applied = parseCatalog(params)
  const normalized = catalogParams(applied)
  for (const [name, value] of params) {
    if (!['search', 'genre', 'sort', 'inStock', 'minPrice', 'maxPrice', 'page'].includes(name))
      normalized.append(name, value)
  }
  const normalizedQuery = normalized.toString()
  const [searchDraft, setSearchDraft] = useState({ value: applied.search, key: location.key })
  if (searchDraft.key !== location.key) setSearchDraft({ value: applied.search, key: location.key })
  const setDraft = (value: string) => setSearchDraft({ value, key: location.key })
  useEffect(() => {
    if (params.toString() !== normalizedQuery)
      navigate(
        { pathname: location.pathname, search: normalizedQuery, hash: location.hash },
        { replace: true, state: location.state },
      )
  }, [normalizedQuery, params, navigate, location.pathname, location.hash, location.state])
  const { data, loading, error, refetch } = useQuery(BooksDocument, {
    variables: {
      search: applied.search,
      genre: applied.genre || undefined,
      inStockOnly: applied.inStock || undefined,
      sort: sorts[applied.sort],
      minPriceCents: applied.minPrice,
      maxPriceCents: applied.maxPrice,
      limit: PAGE_SIZE,
      offset: applied.page * PAGE_SIZE,
    },
  })
  const total = data?.books.total
  useEffect(() => {
    if (!loading && !error && total !== undefined) {
      const lastPage = Math.max(0, Math.ceil(total / PAGE_SIZE) - 1)
      if (applied.page > lastPage) {
        const corrected = new URLSearchParams(normalizedQuery)
        if (lastPage) corrected.set('page', String(lastPage))
        else corrected.delete('page')
        navigate(
          { pathname: location.pathname, search: corrected.toString(), hash: location.hash },
          { replace: true, state: location.state },
        )
      }
    }
  }, [
    loading,
    error,
    total,
    normalizedQuery,
    applied.page,
    navigate,
    location.pathname,
    location.hash,
    location.state,
  ])
  function update(values: Partial<CatalogState>) {
    setParams(catalogParams({ ...applied, ...values, page: 0 }), {
      state: { catalogChanged: true },
    })
  }
  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    update({ search: searchDraft.value.trim().slice(0, 100) })
  }
  function changePage(page: number) {
    setParams(catalogParams({ ...applied, page }), { state: { catalogChanged: true } })
  }
  return {
    ...applied,
    applied,
    draft: searchDraft.value,
    setDraft,
    books: data?.books.items || [],
    genres: data?.genres || [],
    total,
    loading,
    error,
    refetch,
    submitSearch,
    update,
    changePage,
    clearAll: () => setParams({}, { state: { catalogChanged: true } }),
  }
}
