import { localized } from '../../../lib/i18n'
import type { Key, ReactNode } from 'react'
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../app/components/ui/table'
import { AdminPagination } from './AdminFeedback'

type Column = { label: string; numeric?: boolean }

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
