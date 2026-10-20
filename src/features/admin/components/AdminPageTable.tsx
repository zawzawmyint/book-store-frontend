import { localized, t, useI18n } from '../../../lib/i18n'
import { useState, type Key, type ReactNode } from 'react'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type CellContext,
  type ColumnDef,
  type VisibilityState,
} from '@tanstack/react-table'
import { DropdownMenu as DropdownPrimitive } from 'radix-ui'
import { Check, Columns3 } from 'lucide-react'
import { Button } from '../../../app/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '../../../app/components/ui/dropdown-menu'
import { Empty, EmptyHeader, EmptyTitle } from '../../../app/components/ui/empty'
import { ADMIN_PAGE_SIZE } from '../admin-data'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../app/components/ui/table'
import { AdminPagination } from './AdminFeedback'

type Column = { label: string; numeric?: boolean }

export type AdminDataColumn<T> = {
  id: string
  label: string
  numeric?: boolean
  enableHiding?: boolean
  cell: (item: T) => ReactNode
}

// Keep the renderer identity stable so opening a dialog does not remount its row actions.
function renderAdminDataCell<T>({ row, column }: CellContext<T, unknown>) {
  return (column.columnDef.meta as AdminDataColumn<T>).cell(row.original)
}

/** The URL pagination hook owns server state; only column visibility lives here. */
export function AdminDataTable<T>({
  columns,
  items,
  rowKey,
  label,
  emptyMessage,
  page,
  total,
  onPageChange,
  tableClassName,
}: {
  columns: AdminDataColumn<T>[]
  items: T[]
  rowKey: (item: T) => string
  label: string
  emptyMessage: string
  page: number
  total: number
  onPageChange: (page: number) => void
  tableClassName?: string
}) {
  const { direction } = useI18n()
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const pagination = { pageIndex: page - 1, pageSize: ADMIN_PAGE_SIZE }
  const definitions: ColumnDef<T>[] = columns.map((column) => ({
    id: column.id,
    header: column.label,
    enableHiding: column.enableHiding,
    meta: column,
    cell: renderAdminDataCell<T>,
  }))
  // TanStack v8's table stays local; no table methods are passed to memoized consumers.
  // oxlint-disable-next-line react/incompatible-library
  const table = useReactTable({
    data: items,
    columns: definitions,
    getRowId: rowKey,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualFiltering: true,
    rowCount: total,
    state: { pagination, columnVisibility },
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: (updater) => {
      const next = typeof updater === 'function' ? updater(pagination) : updater
      onPageChange(next.pageIndex + 1)
    },
  })
  const numeric = new Set(columns.filter((column) => column.numeric).map((column) => column.id))
  return (
    <>
      <div className="mb-3 flex justify-end">
        <DropdownMenu dir={direction}>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline">
              <Columns3 className="size-4" aria-hidden="true" />
              {t('admin:columns')}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="admin-workspace">
            {table
              .getAllLeafColumns()
              .filter((column) => column.getCanHide())
              .map((column) => (
                <DropdownPrimitive.CheckboxItem
                  key={column.id}
                  checked={column.getIsVisible()}
                  onCheckedChange={(checked) => column.toggleVisibility(checked === true)}
                  onSelect={(event) => event.preventDefault()}
                  className="relative flex min-h-11 cursor-default select-none items-center gap-2 rounded-sm px-3 py-2 text-sm outline-none focus:bg-muted"
                >
                  <span className="size-4">
                    <DropdownPrimitive.ItemIndicator>
                      <Check className="size-4" aria-hidden="true" />
                    </DropdownPrimitive.ItemIndicator>
                  </span>
                  {localized(columns.find((definition) => definition.id === column.id)?.label)}
                </DropdownPrimitive.CheckboxItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="admin-table-panel max-w-full overflow-x-auto">
        <Table aria-label={localized(label)} className={tableClassName}>
          <TableHeader>
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id}>
                {group.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    scope="col"
                    className={numeric.has(header.column.id) ? 'admin-numeric' : undefined}
                  >
                    {localized(flexRender(header.column.columnDef.header, header.getContext()))}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={numeric.has(cell.column.id) ? 'admin-numeric' : undefined}
                    >
                      {localized(flexRender(cell.column.columnDef.cell, cell.getContext()))}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={table.getVisibleLeafColumns().length}>
                  <Empty>
                    <EmptyHeader>
                      <EmptyTitle>{localized(emptyMessage)}</EmptyTitle>
                    </EmptyHeader>
                  </Empty>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <AdminPagination
        page={page}
        total={total}
        itemCount={items.length}
        label={localized(label)}
        change={(nextPage) => table.setPageIndex(nextPage - 1)}
      />
    </>
  )
}

export function AdminPageTable<T>({
  columns,
  items,
  rowKey,
  renderRow,
  label,
  emptyMessage,
  page,
  total,
  onPageChange,
  tableClassName,
}: {
  columns: readonly Column[]
  items: readonly T[]
  rowKey: (item: T) => Key
  renderRow: (item: T) => ReactNode
  label: string
  emptyMessage: string
  page: number
  total: number
  onPageChange: (page: number) => void
  tableClassName?: string
}) {
  return (
    <>
      {items.length === 0 ? (
        <p className="admin-empty">{localized(emptyMessage)}</p>
      ) : (
        <div className="admin-table-panel">
          <Table aria-label={localized(label)} className={tableClassName}>
            <TableHeader>
              <TableRow>
                {columns.map(({ label, numeric }) => (
                  <TableHead
                    key={label}
                    scope="col"
                    className={numeric ? 'admin-numeric' : undefined}
                  >
                    {localized(label)}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={rowKey(item)}>{localized(renderRow(item))}</TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <AdminPagination
        page={page}
        total={total}
        itemCount={items.length}
        label={localized(label)}
        change={onPageChange}
      />
    </>
  )
}
