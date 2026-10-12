import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ADMIN_PAGE_SIZE, patchAdminParams, readPage } from './admin-data'

export function useAdminPagination() {
  const [params, setParams] = useSearchParams()
  const page = readPage(params.get('page'))

  function changeParams(values: Record<string, string>) {
    setParams(patchAdminParams(params, values))
  }

  return {
    params,
    setParams,
    page,
    limit: ADMIN_PAGE_SIZE,
    offset: (page - 1) * ADMIN_PAGE_SIZE,
    changeParams,
    changePage: (nextPage: number) => changeParams({ page: String(nextPage) }),
  }
}

export function useAdminPageCorrection({
  total,
  loading,
  enabled = true,
}: {
  total: number | undefined
  loading: boolean
  enabled?: boolean
}) {
  const [params, setParams] = useSearchParams()
  const page = readPage(params.get('page'))

  useEffect(() => {
    if (!enabled || loading || total === undefined) return
    const lastPage = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE))
    if (page > lastPage) {
      setParams(patchAdminParams(params, { page: String(lastPage) }), { replace: true })
    }
  }, [total, loading, enabled, page, params, setParams])
}
