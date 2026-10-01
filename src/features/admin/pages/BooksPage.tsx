import { useEffect, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { useApolloClient, useMutation, useQuery } from '@apollo/client/react'
import {
  AdminBooksDocument,
  SetBookArchivedDocument,
  type AdminBookFieldsFragment,
} from '../../../generated/graphql'
import { money } from '../../../lib/format'
import { Button } from '../../../app/components/ui/button'
import { Input } from '../../../app/components/ui/input'
import { Label } from '../../../app/components/ui/label'
import { Checkbox } from '../../../app/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../app/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../app/components/ui/table'
import { Badge } from '../../../app/components/ui/badge'
import { Alert, AlertDescription } from '../../../app/components/ui/alert'
import { useAdminAccess, useAdminQueryError } from '../admin-access'
import { readPage, refreshCatalog } from '../admin-data'
import { AdminFeedback, AdminPagination } from '../components/AdminFeedback'
import { AdminDialog } from '../components/AdminDialog'
import { StockDialog } from '../components/StockDialog'

export function BooksPage() {
  const [params, setParams] = useSearchParams()
  const search = (params.get('search') ?? '').slice(0, 100)
  const filter =
    params.get('filter') === 'ARCHIVED'
      ? 'ARCHIVED'
      : params.get('filter') === 'ALL'
        ? 'ALL'
        : 'ACTIVE'
  const lowStockOnly = params.get('low') === 'true'
  const page = readPage(params.get('page'))
  const location = useLocation()
  const client = useApolloClient()
  const { handleError } = useAdminAccess()
  const { data, loading, error, refetch } = useQuery(AdminBooksDocument, {
    variables: { search, filter, lowStockOnly, limit: 20, offset: (page - 1) * 20 },
    fetchPolicy: 'no-cache',
  })
  useAdminQueryError(error)
  const [archive, { loading: saving }] = useMutation(SetBookArchivedDocument)
  const [action, setAction] = useState<{
    kind: 'stock' | 'archive'
    book: AdminBookFieldsFragment
  }>()
  const [failure, setFailure] = useState('')
  const [notice, setNotice] = useState((location.state as { notice?: string } | null)?.notice ?? '')
  const books = data?.adminBooks
  function change(values: Record<string, string>) {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(values)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    setParams(next)
  }
  useEffect(() => {
    if (books && !loading && page > Math.max(1, Math.ceil(books.total / 20))) {
      const next = new URLSearchParams(params)
      next.set('page', String(Math.max(1, Math.ceil(books.total / 20))))
      setParams(next, { replace: true })
    }
  }, [books, loading, page, params, setParams])
  async function archiveBook() {
    if (!action) return
    setFailure('')
    try {
      await archive({ variables: { id: action.book.id, archived: !action.book.archived } })
      setNotice(action.book.archived ? 'Book restored.' : 'Book archived.')
      setAction(undefined)
      void refetch().catch(() => {})
      void refreshCatalog(client).catch(() => {})
    } catch (e) {
      handleError(e)
      setFailure(e instanceof Error ? e.message : 'Unable to save')
    }
  }
  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-serif text-3xl">Manage books</h2>
        <Button asChild><Link to="new" state={{ returnTo: `/admin/books?${params}` }}>Add book</Link></Button>
      </div>
      {notice && (
        <Alert role="status" className="my-4"><AlertDescription>{notice}</AlertDescription></Alert>
      )}
      <form
        onSubmit={(event) => {
          event.preventDefault()
          const values = new FormData(event.currentTarget)
          change({ search: String(values.get('search') ?? '').trim(), page: '' })
        }}
        className="my-6 flex flex-wrap items-end gap-4"
      >
        <div className="min-w-48 flex-1 space-y-2">
          <Label htmlFor="admin-book-search">Search books</Label>
          <Input id="admin-book-search" key={search} name="search" defaultValue={search} maxLength={100} />
        </div>
        <Button type="submit">Search</Button>
        <div className="space-y-2">
          <Label htmlFor="admin-catalog-state">Catalog state</Label>
          <Select value={filter} onValueChange={(value) => change({ filter: value, page: '' })}>
            <SelectTrigger id="admin-catalog-state" className="min-w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="ARCHIVED">Archived</SelectItem>
              <SelectItem value="ALL">All</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 py-3">
          <Checkbox
            id="admin-low-stock"
            checked={lowStockOnly}
            onCheckedChange={(checked) => change({ low: checked === true ? 'true' : '', page: '' })}
          />
          <Label htmlFor="admin-low-stock">Low stock only (5 or fewer)</Label>
        </div>
      </form>
      <AdminFeedback loading={loading} error={error} retry={refetch} />
      {!loading && !error && books && (
        <>
          <p className="mb-3 text-sm">{books.total} books</p>
          {books.items.length === 0 ? (
            <p>No matching books.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[760px]">
                <TableHeader>
                  <TableRow>
                    {['Book', 'Genre', 'Price', 'Stock', 'State', 'Actions'].map((heading) => (
                      <TableHead key={heading} scope="col">
                        {heading}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {books.items.map((book) => (
                    <TableRow key={book.id}>
                      <TableCell>
                        <strong>{book.title}</strong>
                        <p className="mt-1 text-[#6e756c]">{book.author}</p>
                      </TableCell>
                      <TableCell>{book.genre}</TableCell>
                      <TableCell>{money(book.priceCents)}</TableCell>
                      <TableCell>
                        {book.stock}
                        {book.stock <= 5 && <Badge variant="destructive" className="ml-2">Low stock</Badge>}
                      </TableCell>
                      <TableCell><Badge variant={book.archived ? 'secondary' : 'default'}>{book.archived ? 'Archived' : 'Active'}</Badge></TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          <Button asChild variant="ghost"><Link to={`${book.id}/edit`} state={{ returnTo: `/admin/books?${params}` }}>Edit</Link></Button>
                          <Button type="button" variant="ghost"
                            onClick={() => {
                              setFailure('')
                              setAction({ kind: 'stock', book })
                            }}
                          >
                            Adjust stock
                          </Button>
                          <Button type="button" variant="ghost"
                            onClick={() => {
                              setFailure('')
                              setAction({ kind: 'archive', book })
                            }}
                          >
                            {book.archived ? 'Restore' : 'Archive'}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <AdminPagination
            page={page}
            total={books.total}
            change={(next) => change({ page: String(next) })}
          />
        </>
      )}
      {action?.kind === 'stock' && (
        <StockDialog
          book={action.book}
          close={() => setAction(undefined)}
          saved={(message) => {
            setNotice(message)
            setAction(undefined)
            void refetch().catch(() => {})
          }}
        />
      )}
      {action?.kind === 'archive' && (
        <AdminDialog
          title={`${action.book.archived ? 'Restore' : 'Archive'} ${action.book.title}?`}
          close={() => setAction(undefined)}
          busy={saving}
        >
          <p className="mb-4">
            {action.book.archived
              ? 'This book will appear in the store and become available for new orders.'
              : 'This book will be hidden from the store and unavailable for new orders. Earlier order requests are preserved.'}
          </p>
          {failure && <Alert role="alert" variant="destructive"><AlertDescription>{failure}</AlertDescription></Alert>}
          <Button
            disabled={saving}
            onClick={() => {
              void archiveBook()
            }}
          >
            {saving ? 'Saving…' : `Confirm ${action.book.archived ? 'restore' : 'archive'}`}
          </Button>
        </AdminDialog>
      )}
    </section>
  )
}
