// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ApolloClient, ApolloLink, InMemoryCache, Observable } from '@apollo/client'
import { ApolloProvider } from '@apollo/client/react'
import { BookCoverEditor } from './BookCoverEditor'
import type { AdminBookFieldsFragment } from '../../../generated/graphql'
const book: AdminBookFieldsFragment = {
  id: '1',
  title: 'A book',
  author: 'An author',
  genre: 'Fiction',
  description: '',
  priceCents: 100,
  stock: 2,
  archived: false,
  cover: null,
  coverRevision: 0,
}
beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
  URL.createObjectURL = vi.fn(() => 'blob:preview')
  URL.revokeObjectURL = vi.fn()
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})
function mount() {
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink(
      () =>
        new Observable((observer) => {
          observer.next({ data: { adminBook: { ...book, coverRevision: 2 } } })
          observer.complete()
        }),
    ),
  })
  return render(
    <ApolloProvider client={client}>
      <BookCoverEditor book={book} />
    </ApolloProvider>,
  )
}
it('previews without saving, cancels and releases the object URL', async () => {
  mount()
  const user = userEvent.setup()
  await user.upload(
    screen.getByLabelText('Choose cover image'),
    new File(['image'], 'cover.png', { type: 'image/png' }),
  )
  expect(screen.getByAltText('Selected cover for A book')).toBeInTheDocument()
  expect(fetch).not.toHaveBeenCalled()
  await user.click(screen.getByRole('button', { name: 'Cancel selection' }))
  expect(screen.queryByAltText('Selected cover for A book')).toBeNull()
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview')
})
it('sends a revision-conditioned upload and retains the selection after a retryable rejection', async () => {
  vi.mocked(fetch)
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({ error: { code: 'INVALID_COVER_IMAGE', message: 'Invalid image.' } }),
        { status: 422 },
      ),
    )
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          bookId: '1',
          coverRevision: 1,
          cover: { url: 'https://images.example.test/cover.webp', width: 100, height: 150 },
        }),
      ),
    )
  mount()
  const user = userEvent.setup(),
    file = new File(['image'], 'cover.png', { type: 'image/png' })
  await user.upload(screen.getByLabelText('Choose cover image'), file)
  await user.click(screen.getByRole('button', { name: 'Upload cover' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Invalid image.')
  expect(screen.getByAltText('Selected cover for A book')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Upload cover' }))
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Cover saved.'))
  expect(fetch).toHaveBeenCalledWith(
    '/api/books/1/cover',
    expect.objectContaining({
      method: 'PUT',
      body: file,
      credentials: 'include',
      headers: { 'If-Match': '"0"', 'Content-Type': 'image/png' },
    }),
  )
  expect(screen.queryByAltText('Selected cover for A book')).toBeNull()
})
it('reloads stale cover state and requires a separate explicit retry', async () => {
  vi.mocked(fetch).mockResolvedValue(
    new Response(
      JSON.stringify({ error: { code: 'COVER_CONFLICT', message: 'Changed elsewhere.' } }),
      { status: 409 },
    ),
  )
  mount()
  const user = userEvent.setup()
  await user.upload(
    screen.getByLabelText('Choose cover image'),
    new File(['image'], 'cover.png', { type: 'image/png' }),
  )
  await user.click(screen.getByRole('button', { name: 'Upload cover' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('changed elsewhere')
  expect(fetch).toHaveBeenCalledTimes(1)
  expect(screen.getByRole('button', { name: 'Upload cover' })).toBeEnabled()
})
