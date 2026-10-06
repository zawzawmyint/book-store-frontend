import { AdminPageTable } from '../components/AdminPageTable'
import { AdminFilterToolbar } from '../components/AdminFilterToolbar'
import { AdminPageHeader } from '../components/AdminPageHeader'
import { useEffect, useState } from 'react'
import { BookCover } from '../../books/components/BookCover'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { useQuery } from '@apollo/client/react'
import { AdminBooksDocument, type AdminBookFieldsFragment } from '../../../generated/graphql'
import { money } from '../../../lib/format'
import { Button } from '../../../app/components/ui/button'
import { Label } from '../../../app/components/ui/label'
import { Checkbox } from '../../../app/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../app/components/ui/select'
import { TableCell } from '../../../app/components/ui/table'
import { Badge } from '../../../app/components/ui/badge'
import { Alert, AlertDescription } from '../../../app/components/ui/alert'
import { useAdminAccess, useAdminQueryError } from '../admin-access'
import { ADMIN_PAGE_SIZE, readPage } from '../admin-data'
import { AdminFeedback } from '../components/AdminFeedback'
import { StockDialog } from '../components/StockDialog'
import { ArchiveBookDialog } from '../components/ArchiveBookDialog'
import { BookRowActions } from '../components/BookRowActions'

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
  const { role } = useAdminAccess()
  const { data, loading, error, refetch } = useQuery(AdminBooksDocument, {
    variables: {
      search,
      filter,
      lowStockOnly,
      limit: ADMIN_PAGE_SIZE,
      offset: (page - 1) * ADMIN_PAGE_SIZE,
    },
    fetchPolicy: 'no-cache',
  })
  useAdminQueryError(error)
  const [action, setAction] = useState<{
    kind: 'stock' | 'archive'
    book: AdminBookFieldsFragment
    opener?: HTMLButtonElement | null
  }>()
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
    if (books && !loading && page > Math.max(1, Math.ceil(books.total / ADMIN_PAGE_SIZE))) {
      const next = new URLSearchParams(params)
      next.set('page', String(Math.max(1, Math.ceil(books.total / ADMIN_PAGE_SIZE))))
      setParams(next, { replace: true })
    }
  }, [books, loading, page, params, setParams])
  function saved(message: string) {
    setNotice(message)
    setAction(undefined)
    void refetch().catch(() => {})
  }
  return (
    <section>
      <AdminPageHeader
        title="Manage books"
        description="Manage your catalog, inventory, and book availability."
        actions={
          <Button asChild>
            <Link to="new" state={{ returnTo: `/admin/books?${params}` }}>
              Add book
            </Link>
          </Button>
        }
      />
      {notice && (
        <Alert role="status" className="my-4">
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      )}
      <AdminFilterToolbar
        search={search}
        onSearch={(value) => change({ search: value, page: '' })}
        searchLabel="Search books"
        searchPlaceholder="Title, author, or genre"
      >
        <div className="admin-toolbar-field">
          <Label htmlFor="admin-catalog-state">Catalog state</Label>
          <Select value={filter} onValueChange={(value) => change({ filter: value, page: '' })}>
            <SelectTrigger id="admin-catalog-state" className="min-w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="admin-workspace">
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="ARCHIVED">Archived</SelectItem>
              <SelectItem value="ALL">All</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="admin-toolbar-toggle">
          <Checkbox
            id="admin-low-stock"
            checked={lowStockOnly}
            onCheckedChange={(checked) => change({ low: checked === true ? 'true' : '', page: '' })}
          />
          <Label htmlFor="admin-low-stock">Low stock only (5 or fewer)</Label>
        </div>
      </AdminFilterToolbar>
      <AdminFeedback loading={loading} error={error} retry={refetch} />
      {!loading && !error && books && (
        <AdminPageTable
          columns={[
            { label: 'Book' },
            { label: 'Genre' },
            { label: 'Price', numeric: true },
            { label: 'Stock', numeric: true },
            { label: 'State' },
            { label: 'Actions' },
          ]}
          items={books.items}
          rowKey={(book) => book.id}
          label="books"
          emptyMessage="No matching books."
          page={page}
          total={books.total}
          onPageChange={(next) => change({ page: String(next) })}
          tableClassName="min-w-[760px]"
          renderRow={(book) => (
            <>
              <TableCell>
                <div className="flex items-center gap-3">
                  <BookCover id={book.id} title={book.title} author={book.author} compact />
                  <div>
                    <strong className="font-medium">{book.title}</strong>
                    <p className="mt-1 text-muted-foreground">{book.author}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell>{book.genre}</TableCell>
              <TableCell className="admin-numeric">{money(book.priceCents)}</TableCell>
              <TableCell className="admin-numeric">
                {book.stock}
                {book.stock <= 5 && (
                  <Badge variant="destructive" className="ml-2">
                    Low stock
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                <Badge variant={book.archived ? 'secondary' : 'default'}>
                  {book.archived ? 'Archived' : 'Active'}
                </Badge>
              </TableCell>
              <TableCell>
                <BookRowActions
                  book={book}
                  returnTo={`/admin/books?${params}`}
                  isAdmin={role === 'ADMIN'}
                  onStock={() => setAction({ kind: 'stock', book })}
                  onArchive={(opener) => setAction({ kind: 'archive', book, opener })}
                />
              </TableCell>
            </>
          )}
        />
      )}
      {action?.kind === 'stock' && (
        <StockDialog book={action.book} close={() => setAction(undefined)} saved={saved} />
      )}
      {action?.kind === 'archive' && (
        <ArchiveBookDialog
          book={action.book}
          close={() => setAction(undefined)}
          opener={action.opener}
          saved={saved}
        />
      )}
    </section>
  )
}
