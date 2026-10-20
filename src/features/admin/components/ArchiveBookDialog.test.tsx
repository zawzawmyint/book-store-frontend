// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { MockedProvider } from '@apollo/client/testing/react'
import { SetBookArchivedDocument, type AdminBookFieldsFragment } from '../../../generated/graphql'
import { ArchiveBookDialog } from './ArchiveBookDialog'

vi.mock('../admin-data', () => ({ refreshCatalog: vi.fn(async () => {}) }))
afterEach(cleanup)
const book: AdminBookFieldsFragment = {
  id: 'b1',
  title: 'Quiet Book',
  author: 'Author',
  genre: 'Fiction',
  description: '',
  priceCents: 100,
  stock: 3,
  archived: false,
  cover: null,
  coverRevision: 0,
}
function mount(mocks: unknown[], archived = false) {
  function Harness() {
    const [open, setOpen] = useState(false)
    const [removed, setRemoved] = useState(false)
    const [opener, setOpener] = useState<HTMLButtonElement | null>(null)
    return (
      <main id="admin-main" tabIndex={-1}>
        {!removed && (
          <button
            onClick={(event) => {
              setOpener(event.currentTarget)
              setOpen(true)
            }}
          >
            Open confirmation
          </button>
        )}
        {open && (
          <ArchiveBookDialog
            book={{ ...book, archived }}
            opener={opener}
            close={() => setOpen(false)}
            saved={() => {
              setRemoved(true)
              setOpen(false)
            }}
          />
        )}
      </main>
    )
  }
  return render(
    <MockedProvider mocks={mocks as never}>
      <Harness />
    </MockedProvider>,
  )
}
it('focuses Cancel and sends nothing until explicit confirmation, then blocks pending dismissal', async () => {
  const user = userEvent.setup()
  const result = vi.fn(() => ({
    data: { setBookArchived: { __typename: 'AdminBook', ...book, archived: true } },
  }))
  mount([
    {
      request: { query: SetBookArchivedDocument, variables: { id: book.id, archived: true } },
      delay: 100,
      result,
    },
  ])
  await user.click(screen.getByRole('button', { name: 'Open confirmation' }))
  expect(screen.getByRole('alertdialog')).toBeTruthy()
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cancel' }))
  expect(result).not.toHaveBeenCalled()
  await user.dblClick(screen.getByRole('button', { name: 'Confirm archive' }))
  expect(screen.getByRole('button', { name: 'Cancel' })).toHaveProperty('disabled', true)
  await user.keyboard('{Escape}')
  expect(screen.getByRole('alertdialog')).toBeTruthy()
  await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
  expect(result).toHaveBeenCalledTimes(1)
  await waitFor(() => expect(document.activeElement).toBe(document.getElementById('admin-main')))
})
it('keeps a failed restore open for retry and returns focus to the opener on Cancel', async () => {
  const user = userEvent.setup()
  mount(
    [
      {
        request: { query: SetBookArchivedDocument, variables: { id: book.id, archived: false } },
        error: new Error('Offline'),
      },
    ],
    true,
  )
  const opener = screen.getByRole('button', { name: 'Open confirmation' })
  await user.click(opener)
  await user.click(screen.getByRole('button', { name: 'Confirm restore' }))
  expect(await screen.findByRole('alert')).toBeTruthy()
  expect(screen.getByRole('alertdialog')).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Confirm restore' })).toHaveProperty('disabled', false)
  await user.click(screen.getByRole('button', { name: 'Cancel' }))
  await waitFor(() => expect(document.activeElement).toBe(opener))
})
it('does not treat a missing mutation result as confirmed success', async () => {
  const user = userEvent.setup()
  mount([
    {
      request: { query: SetBookArchivedDocument, variables: { id: book.id, archived: true } },
      result: { data: {} },
    },
  ])
  await user.click(screen.getByRole('button', { name: 'Open confirmation' }))
  await user.click(screen.getByRole('button', { name: 'Confirm archive' }))
  expect(await screen.findByRole('alert')).toBeTruthy()
  expect(screen.getByRole('alertdialog')).toBeTruthy()
})
it('retries a failed restore without closing until a successful response', async () => {
  const user = userEvent.setup()
  const request = { query: SetBookArchivedDocument, variables: { id: book.id, archived: false } }
  mount(
    [
      { request, error: new Error('Offline') },
      {
        request,
        result: {
          data: { setBookArchived: { __typename: 'AdminBook', ...book, archived: false } },
        },
      },
    ],
    true,
  )
  await user.click(screen.getByRole('button', { name: 'Open confirmation' }))
  await user.click(screen.getByRole('button', { name: 'Confirm restore' }))
  expect(await screen.findByRole('alert')).toBeTruthy()
  await user.click(screen.getByRole('button', { name: 'Confirm restore' }))
  await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
  expect(screen.queryByRole('button', { name: 'Open confirmation' })).toBeNull()
})
