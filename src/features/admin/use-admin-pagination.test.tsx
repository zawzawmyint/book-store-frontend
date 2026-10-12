// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest'
import { act, cleanup, renderHook } from '@testing-library/react'
import { MemoryRouter, useLocation, useNavigate, useNavigationType } from 'react-router-dom'
import { useAdminPagination, useAdminPageCorrection } from './use-admin-pagination'

afterEach(cleanup)

function mount(
  url: string,
  correction: { total: number | undefined; loading: boolean; enabled?: boolean } = {
    total: undefined,
    loading: false,
  },
) {
  return renderHook(
    (props) => {
      const pagination = useAdminPagination()
      useAdminPageCorrection(props)
      return {
        ...pagination,
        location: useLocation(),
        navigate: useNavigate(),
        navigationType: useNavigationType(),
      }
    },
    {
      initialProps: correction,
      wrapper: ({ children }) => (
        <MemoryRouter initialEntries={['/before', url]} initialIndex={1}>
          {children}
        </MemoryRouter>
      ),
    },
  )
}

it.each(['0', '-1', 'invalid', '9007199254740992', '429496731'])(
  'uses a safe first-page offset for invalid page %s without rewriting the URL',
  (page) => {
    const view = mount(`/admin/orders?page=${page}&status=PREPARING`)
    expect(view.result.current.page).toBe(1)
    expect(view.result.current.limit).toBe(5)
    expect(view.result.current.offset).toBe(0)
    expect(view.result.current.params.get('page')).toBe(page)
  },
)

it('retains filters during page navigation and resets only the requested keys on filter changes', () => {
  const view = mount('/admin/orders?status=PREPARING&search=reader&returnTo=books&page=2')
  act(() => view.result.current.changePage(3))
  expect(view.result.current.offset).toBe(10)
  expect(view.result.current.params.get('status')).toBe('PREPARING')
  expect(view.result.current.params.get('search')).toBe('reader')
  expect(view.result.current.navigationType).toBe('PUSH')
  act(() => view.result.current.changeParams({ search: '', page: '' }))
  expect(view.result.current.page).toBe(1)
  expect(view.result.current.params.has('page')).toBe(false)
  expect(view.result.current.params.has('search')).toBe(false)
  expect(view.result.current.params.get('status')).toBe('PREPARING')
  expect(view.result.current.params.get('returnTo')).toBe('books')
  act(() => view.result.current.navigate(-1))
  expect(view.result.current.page).toBe(3)
  expect(view.result.current.params.get('search')).toBe('reader')
})

it('waits for data, completed loading, and valid filters before replacing an out-of-range page', () => {
  const view = mount('/admin/activity?page=4&actorUserId=reader')
  expect(view.result.current.page).toBe(4)
  view.rerender({ total: 6, loading: true, enabled: true })
  expect(view.result.current.page).toBe(4)
  view.rerender({ total: 6, loading: false, enabled: false })
  expect(view.result.current.page).toBe(4)
  view.rerender({ total: 6, loading: false, enabled: true })
  expect(view.result.current.page).toBe(2)
  expect(view.result.current.params.get('actorUserId')).toBe('reader')
  expect(view.result.current.navigationType).toBe('REPLACE')
  const correctedKey = view.result.current.location.key
  view.rerender({ total: 6, loading: false, enabled: true })
  expect(view.result.current.location.key).toBe(correctedKey)
  act(() => view.result.current.navigate(-1))
  expect(view.result.current.location.pathname).toBe('/before')
})

it('corrects an empty result to page one and preserves a book-history return URL', () => {
  const view = mount('/admin/books/2/history?page=9&returnTo=%2Fadmin%2Fbooks%3Flow%3Dtrue', {
    total: 0,
    loading: false,
  })
  expect(view.result.current.page).toBe(1)
  expect(view.result.current.params.get('returnTo')).toBe('/admin/books?low=true')
})
