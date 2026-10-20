import { localized, t, useI18n } from '../../../lib/i18n'
import { AdminDataTable, type AdminDataColumn } from '../components/AdminPageTable'
import { AdminFilterToolbar } from '../components/AdminFilterToolbar'
import { AdminPageHeader } from '../components/AdminPageHeader'
import { useState } from 'react'
import { BookCover } from '../../books/components/BookCover'
import { Link, useLocation } from 'react-router-dom'
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
import { Badge } from '../../../app/components/ui/badge'
import { Alert, AlertDescription } from '../../../app/components/ui/alert'
import { useAdminAccess, useAdminQueryError } from '../admin-access'
import { useAdminPagination, useAdminPageCorrection } from '../use-admin-pagination'
import { bookSaveNotice } from '../book-form'
import { AdminFeedback } from '../components/AdminFeedback'
import { StockDialog } from '../components/StockDialog'
import { ArchiveBookDialog } from '../components/ArchiveBookDialog'
import { BookRowActions } from '../components/BookRowActions'

export function BooksPage() {
  useI18n()

  const { params, page, limit, offset, changePage, changeParams } = useAdminPagination()
  const search = (params.get('search') ?? '').slice(0, 100)
  const filter =
    params.get('filter') === 'ARCHIVED'
      ? 'ARCHIVED'
      : params.get('filter') === 'ALL'
        ? 'ALL'
        : 'ACTIVE'
  const lowStockOnly = params.get('low') === 'true'
  const location = useLocation()
  const { role } = useAdminAccess()
  const { data, loading, error, refetch } = useQuery(AdminBooksDocument, {
    variables: {
      search,
      filter,
      lowStockOnly,
      limit,
      offset,
    },
    fetchPolicy: 'no-cache',
  })
  useAdminQueryError(error)
  const [action, setAction] = useState<{
    kind: 'stock' | 'archive'
    book: AdminBookFieldsFragment
    opener?: HTMLButtonElement | null
  }>()
  const [notice, setNotice] = useState(() =>
    bookSaveNotice((location.state as { notice?: unknown } | null)?.notice),
  )
  const books = data?.adminBooks
  useAdminPageCorrection({ total: books?.total, loading })
  function saved(message: string) {
    setNotice(message)
    setAction(undefined)
    void refetch().catch(() => {})
  }
  const columns: AdminDataColumn<AdminBookFieldsFragment>[] = [
    {
      id: 'book',
      label: t('common:labelBook'),
      enableHiding: false,
      cell: (book) => (
        <>
          <div className="flex items-center gap-3">
            <BookCover
              cover={book.cover}
              decorative
              id={book.id}
              title={localized(book.title)}
              author={book.author}
              compact
            />
            <div>
              <strong className="font-medium">
                <bdi dir="auto">{localized(book.title)}</bdi>
              </strong>
              <p className="mt-1 text-muted-foreground">
                <bdi dir="auto">{localized(book.author)}</bdi>
              </p>
            </div>
          </div>
        </>
      ),
    },
    {
      id: 'genre',
      label: t('common:labelGenre'),
      cell: (book) => (
        <>
          <bdi dir="auto">{localized(book.genre)}</bdi>
        </>
      ),
    },
    {
      id: 'price',
      label: t('common:labelPrice'),
      numeric: true,
      cell: (book) => <>{localized(money(book.priceCents))}</>,
    },
    {
      id: 'stock',
      label: t('common:labelStock'),
      numeric: true,
      cell: (book) => (
        <>
          {localized(book.stock)}
          {book.stock <= 5 && (
            <Badge variant="destructive" className="ms-2">
              {t('admin:lowStock')}
            </Badge>
          )}
        </>
      ),
    },
    {
      id: 'state',
      label: t('common:labelState'),
      cell: (book) => (
        <>
          <Badge variant={book.archived ? 'secondary' : 'default'}>
            {localized(book.archived ? t('admin:archived') : t('admin:active'))}
          </Badge>
        </>
      ),
    },
    {
      id: 'actions',
      label: t('common:labelActions'),
      enableHiding: false,
      cell: (book) => (
        <>
          <BookRowActions
            book={book}
            returnTo={`/admin/books?${params}`}
            isAdmin={role === 'ADMIN'}
            onStock={() => setAction({ kind: 'stock', book })}
            onArchive={(opener) => setAction({ kind: 'archive', book, opener })}
          />
        </>
      ),
    },
  ]
  return (
    <section>
      <AdminPageHeader
        title={t('admin:manageBooks')}
        description={t('admin:manageYourCatalogInventoryAndBookAvailability')}
        actions={
          <Button asChild>
            <Link to="new" state={{ returnTo: `/admin/books?${params}` }}>
              {t('admin:addBook')}
            </Link>
          </Button>
        }
      />
      {notice && (
        <Alert role="status" className="my-4">
          <AlertDescription>{localized(notice)}</AlertDescription>
        </Alert>
      )}
      <AdminFilterToolbar
        search={search}
        onSearch={(value) => changeParams({ search: value, page: '' })}
        searchLabel={t('admin:searchBooks')}
        searchPlaceholder={t('admin:titleAuthorOrGenre')}
      >
        <div className="admin-toolbar-field">
          <Label htmlFor="admin-catalog-state">{t('admin:catalogState')}</Label>
          <Select
            value={filter}
            onValueChange={(value) => changeParams({ filter: value, page: '' })}
          >
            <SelectTrigger id="admin-catalog-state" className="min-w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="admin-workspace">
              <SelectItem value="ACTIVE">{t('admin:active')}</SelectItem>
              <SelectItem value="ARCHIVED">{t('admin:archived')}</SelectItem>
              <SelectItem value="ALL">{t('admin:all')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="admin-toolbar-toggle">
          <Checkbox
            id="admin-low-stock"
            checked={lowStockOnly}
            onCheckedChange={(checked) =>
              changeParams({ low: checked === true ? 'true' : '', page: '' })
            }
          />
          <Label htmlFor="admin-low-stock">{t('admin:lowStockOnly5OrFewer')}</Label>
        </div>
      </AdminFilterToolbar>
      <AdminFeedback loading={loading} error={localized(error)} retry={refetch} />
      <div hidden={loading || !!error || !books}>
        <AdminDataTable
          columns={columns}
          items={books?.items ?? []}
          rowKey={(book) => book.id}
          label={t('admin:books2')}
          emptyMessage={t('admin:noMatchingBooks')}
          page={page}
          total={books?.total ?? 0}
          onPageChange={changePage}
          tableClassName="min-w-[760px]"
        />
      </div>
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
