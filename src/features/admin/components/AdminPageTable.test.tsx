// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AdminDataTable, type AdminDataColumn } from './AdminPageTable'

afterEach(cleanup)
const columns: AdminDataColumn<{ id: string; genre: string }>[] = [
  { id: 'identity', label: 'Book', enableHiding: false, cell: (book) => book.id },
  { id: 'genre', label: 'Genre', cell: (book) => book.genre },
  { id: 'actions', label: 'Actions', enableHiding: false, cell: () => <button>Edit</button> },
]
it('hides optional columns while preserving identity, actions and server page navigation', async () => {
  const user = userEvent.setup()
  const change = vi.fn()
  const props = {
    columns,
    items: [{ id: 'b6', genre: 'Fiction' }],
    rowKey: (book: { id: string }) => book.id,
    label: 'Books',
    emptyMessage: 'No books',
    page: 2,
    total: 16,
    onPageChange: change,
  }
  const view = render(<AdminDataTable {...props} />)
  await user.click(screen.getByRole('button', { name: /columns/i }))
  expect(screen.queryByRole('menuitemcheckbox', { name: 'Book' })).toBeNull()
  expect(screen.queryByRole('menuitemcheckbox', { name: 'Actions' })).toBeNull()
  await user.click(screen.getByRole('menuitemcheckbox', { name: 'Genre' }))
  await user.keyboard('{Escape}')
  expect(screen.queryByRole('columnheader', { name: 'Genre' })).toBeNull()
  expect(screen.getByRole('cell', { name: 'b6' })).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Edit' })).toBeTruthy()
  await user.click(screen.getByRole('button', { name: 'Next' }))
  expect(change).toHaveBeenCalledWith(3)
  view.rerender(<AdminDataTable {...props} page={3} items={[{ id: 'b11', genre: 'History' }]} />)
  expect(screen.getByRole('cell', { name: 'b11' })).toBeTruthy()
  expect(screen.queryByRole('columnheader', { name: 'Genre' })).toBeNull()
  expect(screen.queryByText('b6')).toBeNull()
  expect(screen.getByText('Showing 11–11 of 16')).toBeTruthy()
  view.unmount()
  render(<AdminDataTable {...props} />)
  expect(screen.getByRole('columnheader', { name: 'Genre' })).toBeTruthy()
})
it('keeps an empty state in a semantic row with the visible column span', async () => {
  const user = userEvent.setup()
  render(
    <AdminDataTable
      columns={columns}
      items={[]}
      rowKey={(book) => book.id}
      label="Books"
      emptyMessage="No books"
      page={1}
      total={0}
      onPageChange={() => {}}
    />,
  )
  await user.click(screen.getByRole('button', { name: /columns/i }))
  await user.click(screen.getByRole('menuitemcheckbox', { name: 'Genre' }))
  await user.keyboard('{Escape}')
  const table = screen.getByRole('table', { name: 'Books' })
  expect(within(table).getByText('No books').closest('td')?.colSpan).toBe(2)
})
