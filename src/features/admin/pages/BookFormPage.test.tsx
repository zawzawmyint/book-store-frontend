// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ApolloClient, ApolloLink, InMemoryCache, Observable } from '@apollo/client'
import { ApolloProvider } from '@apollo/client/react'
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom'
import { BookFormPage } from './BookFormPage'

const book = {
  __typename: 'AdminBook' as const,
  id: '17',
  title: 'A book',
  author: 'Author',
  genre: 'Fiction',
  description: 'Description',
  priceCents: 100,
  stock: 3,
  archived: false,
  cover: null,
  coverRevision: 0,
}
const operations: string[] = []
let failDetails = false
let reloadFails = false
beforeEach(() => {
  operations.length = 0
  failDetails = false
  reloadFails = false
  vi.stubGlobal('fetch', vi.fn())
  URL.createObjectURL = vi.fn(() => 'blob:preview')
  URL.revokeObjectURL = vi.fn()
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})
function mount(edit = false, existingCover = false) {
  const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink(
      (operation) =>
        new Observable((observer) => {
          operations.push(operation.operationName!)
          if (operation.operationName === 'AdminBook' && operation.variables.id === '18') {
            observer.error(new Error('Other book unavailable'))
            return
          }
          if (failDetails && operation.operationName === 'CreateBook') {
            observer.error(new Error('Details rejected'))
            return
          }
          const reads = operations.filter((n) => n === 'AdminBook').length
          if (reloadFails && operation.operationName === 'AdminBook' && reads > 1) {
            observer.error(new Error('Reload unavailable'))
            return
          }
          const data =
            operation.operationName === 'CreateBook'
              ? { createBook: book }
              : operation.operationName === 'UpdateBook'
                ? { updateBook: book }
                : {
                    adminBook: {
                      ...book,
                      cover: existingCover
                        ? {
                            __typename: 'BookCover',
                            url: reads > 1 ? '/changed.webp' : '/saved.webp',
                            width: 100,
                            height: 150,
                          }
                        : null,
                      coverRevision: reads > 1 ? 2 : 0,
                    },
                  }
          observer.next({ data })
          observer.complete()
        }),
    ),
  })
  render(
    <ApolloProvider client={client}>
      <MemoryRouter initialEntries={[edit ? '/admin/books/17/edit' : '/admin/books/new']}>
        <Link to="/admin/books/18/edit">Open another book</Link>
        <Routes>
          <Route path="/admin/books/new" element={<BookFormPage />} />
          <Route path="/admin/books/:id/edit" element={<BookFormPage />} />
          <Route path="/admin/books" element={<h1>Catalog destination</h1>} />
        </Routes>
      </MemoryRouter>
    </ApolloProvider>,
  )
}
async function fill() {
  const user = userEvent.setup()
  for (const [label, value] of [
    ['Title', 'A book'],
    ['Author', 'Author'],
    ['Genre', 'Fiction'],
    ['Description', 'Description'],
    ['Price (USD)', '1.00'],
  ])
    await user.type(screen.getByLabelText(label, { exact: true }), value)
  return user
}
async function select(user: ReturnType<typeof userEvent.setup>) {
  await user.upload(
    screen.getByLabelText('Choose cover image'),
    new File(['image'], 'cover.png', { type: 'image/png' }),
  )
}
function uploaded() {
  return new Response(
    JSON.stringify({
      bookId: '17',
      coverRevision: 1,
      cover: { url: 'http://localhost/media/covers/new.webp', width: 100, height: 150 },
    }),
  )
}
it('creates a book and uploads its selected cover through the single form action', async () => {
  vi.mocked(fetch).mockResolvedValue(uploaded())
  mount()
  const user = await fill()
  await select(user)
  expect(fetch).not.toHaveBeenCalled()
  expect(screen.queryByRole('button', { name: 'Upload cover' })).toBeNull()
  await user.click(screen.getByRole('button', { name: 'Save book' }))
  await screen.findByRole('heading', { name: 'Catalog destination' })
  expect(operations.filter((n) => n === 'CreateBook')).toHaveLength(1)
  expect(fetch).toHaveBeenCalledWith(
    '/api/books/17/cover',
    expect.objectContaining({
      method: 'PUT',
      headers: expect.objectContaining({ 'If-Match': '"0"' }),
    }),
  )
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview')
})
it('does not reuse the previous book when a different edit route fails to load', async () => {
  mount(true)
  await screen.findByDisplayValue('A book')
  await userEvent.setup().click(screen.getByRole('link', { name: 'Open another book' }))
  await screen.findByText('Other book unavailable')
  expect(screen.queryByDisplayValue('A book')).toBeNull()
  expect(screen.queryByRole('button', { name: 'Save book' })).toBeNull()
  expect(operations.filter((n) => n === 'UpdateBook')).toHaveLength(0)
})
it('shows a concurrent replacement before allowing a staged removal retry', async () => {
  vi.mocked(fetch).mockResolvedValue(
    new Response(
      JSON.stringify({ error: { code: 'COVER_CONFLICT', message: 'Changed elsewhere.' } }),
      { status: 409 },
    ),
  )
  mount(true, true)
  await screen.findByDisplayValue('A book')
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: 'Remove cover' }))
  await user.click(screen.getByRole('button', { name: 'Save book' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('changed elsewhere')
  expect(screen.getByAltText('Cover of A book')).toHaveAttribute('src', '/changed.webp')
  expect(fetch).toHaveBeenCalledTimes(1)
})
it('keeps the saved ID and selection when cover upload fails, then retries without duplicate creation', async () => {
  vi.mocked(fetch)
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({ error: { code: 'INVALID_COVER_IMAGE', message: 'Invalid image.' } }),
        { status: 422 },
      ),
    )
    .mockResolvedValueOnce(uploaded())
  mount()
  const user = await fill()
  await select(user)
  await user.click(screen.getByRole('button', { name: 'Save book' }))
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Book details saved, but the cover was not saved',
  )
  expect(screen.getByLabelText('Title', { exact: true })).toHaveValue('A book')
  expect(screen.getByAltText('Selected cover for A book')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Save book' }))
  await screen.findByRole('heading', { name: 'Catalog destination' })
  expect(operations.filter((n) => n === 'CreateBook')).toHaveLength(1)
  expect(operations.filter((n) => n === 'UpdateBook')).toHaveLength(0)
  expect(fetch).toHaveBeenCalledTimes(2)
})
it('does not upload when details fail and retains the draft', async () => {
  failDetails = true
  mount()
  const user = await fill()
  await select(user)
  await user.click(screen.getByRole('button', { name: 'Save book' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Details rejected')
  expect(fetch).not.toHaveBeenCalled()
  expect(screen.getByAltText('Selected cover for A book')).toBeInTheDocument()
})
it('saves without a cover and makes no image request', async () => {
  mount()
  const user = await fill()
  await user.click(screen.getByRole('button', { name: 'Save book' }))
  await screen.findByRole('heading', { name: 'Catalog destination' })
  expect(fetch).not.toHaveBeenCalled()
})
it('keeps the form busy until the cover finishes and updates edited details first', async () => {
  let finish!: (value: Response) => void
  vi.mocked(fetch).mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve
      }),
  )
  mount(true)
  await screen.findByDisplayValue('A book')
  const user = userEvent.setup()
  await user.clear(screen.getByLabelText('Title', { exact: true }))
  await user.type(screen.getByLabelText('Title', { exact: true }), 'Edited book')
  await select(user)
  await user.click(screen.getByRole('button', { name: 'Save book' }))
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))
  expect(operations).toContain('UpdateBook')
  expect(screen.getByLabelText('Title', { exact: true })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled()
  finish(uploaded())
  await screen.findByRole('heading', { name: 'Catalog destination' })
})
it('applies staged removal only on Save book', async () => {
  vi.mocked(fetch).mockResolvedValue(
    new Response(JSON.stringify({ bookId: '17', cover: null, coverRevision: 1 })),
  )
  mount(true, true)
  await screen.findByDisplayValue('A book')
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: 'Remove cover' }))
  expect(fetch).not.toHaveBeenCalled()
  await user.click(screen.getByRole('button', { name: 'Save book' }))
  await screen.findByRole('heading', { name: 'Catalog destination' })
  expect(fetch).toHaveBeenCalledWith(
    '/api/books/17/cover',
    expect.objectContaining({ method: 'DELETE' }),
  )
})
it('blocks retry when conflict recovery fails, then reloads cover metadata without losing text edits', async () => {
  vi.mocked(fetch)
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({ error: { code: 'COVER_CONFLICT', message: 'Changed elsewhere.' } }),
        { status: 409 },
      ),
    )
    .mockResolvedValueOnce(uploaded())
  mount(true)
  await screen.findByDisplayValue('A book')
  const user = userEvent.setup()
  await user.clear(screen.getByLabelText('Title', { exact: true }))
  await user.type(screen.getByLabelText('Title', { exact: true }), 'Edited title')
  await select(user)
  reloadFails = true
  await user.click(screen.getByRole('button', { name: 'Save book' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('changed elsewhere')
  expect(screen.getByRole('button', { name: 'Save book' })).toBeDisabled()
  expect(screen.getByLabelText('Title', { exact: true })).toHaveValue('Edited title')
  reloadFails = false
  await user.click(screen.getByRole('button', { name: 'Reload cover' }))
  await waitFor(() => expect(screen.getByRole('button', { name: 'Save book' })).toBeEnabled())
  await user.click(screen.getByRole('button', { name: 'Save book' }))
  await screen.findByRole('heading', { name: 'Catalog destination' })
  expect(fetch).toHaveBeenCalledTimes(2)
  expect(fetch).toHaveBeenLastCalledWith(
    '/api/books/17/cover',
    expect.objectContaining({ headers: expect.objectContaining({ 'If-Match': '"2"' }) }),
  )
  expect(operations.filter((n) => n === 'UpdateBook')).toHaveLength(1)
})
