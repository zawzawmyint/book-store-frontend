// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AdminPagination } from './AdminFeedback'
import { ADMIN_PAGE_SIZE } from '../admin-data'

afterEach(cleanup)
it('offers bounded numeric server-page navigation with current page and real boundaries', async () => {
  const change = vi.fn()
  const { rerender } = render(
    <AdminPagination
      page={6}
      total={20 * ADMIN_PAGE_SIZE}
      itemCount={ADMIN_PAGE_SIZE}
      label="Books"
      change={change}
    />,
  )
  expect(screen.getByRole('button', { current: 'page' })).toHaveTextContent('6')
  expect(screen.getAllByRole('button').length).toBeLessThanOrEqual(9)
  await userEvent.click(screen.getByRole('button', { name: 'Page 7' }))
  expect(change).toHaveBeenCalledWith(7)
  rerender(
    <AdminPagination
      page={1}
      total={ADMIN_PAGE_SIZE}
      itemCount={ADMIN_PAGE_SIZE}
      label="Books"
      change={change}
    />,
  )
  expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
})
