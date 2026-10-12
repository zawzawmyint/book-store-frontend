import { PaymentStatus } from '../../orders/PaymentStatus'
import { OrderStatusBadge } from '../../orders/OrderStatusBadge'
import { orderStatusLabels } from '../../orders/order-status'
import type { OrderStatusFilter } from '../../../generated/graphql'
import { Label } from '../../../app/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../app/components/ui/select'
import { AdminPageTable } from '../components/AdminPageTable'
import { AdminPageHeader } from '../components/AdminPageHeader'
import { AdminFilterToolbar } from '../components/AdminFilterToolbar'
import { Link } from 'react-router-dom'
import { useQuery } from '@apollo/client/react'
import { AdminOrdersDocument } from '../../../generated/graphql'
import { money, serverDate } from '../../../lib/format'
import { IconAction } from '../../../app/components/IconAction'
import { Eye } from 'lucide-react'
import { TableCell } from '../../../app/components/ui/table'
import { useAdminQueryError } from '../admin-access'
import { useAdminPagination, useAdminPageCorrection } from '../use-admin-pagination'
import { AdminFeedback } from '../components/AdminFeedback'

export function OrdersPage() {
  const { params, page, limit, offset, changePage, changeParams } = useAdminPagination()
  const search = (params.get('search') ?? '').slice(0, 100).trim()
  const value = params.get('status') ?? 'ALL'
  const status: OrderStatusFilter = Object.hasOwn(orderStatusLabels, value)
    ? (value as OrderStatusFilter)
    : 'ALL'
  const { data, loading, error, refetch } = useQuery(AdminOrdersDocument, {
    variables: {
      ...(search ? { search } : {}),
      status,
      limit,
      offset,
    },
    fetchPolicy: 'no-cache',
  })
  useAdminQueryError(error)
  const orders = data?.adminOrders
  useAdminPageCorrection({ total: orders?.total, loading })
  return (
    <section>
      <AdminPageHeader
        title="All order requests"
        description="Saved delivery orders with payment and fulfillment state."
      />
      <AdminFilterToolbar
        search={search}
        searchLabel="Search orders"
        searchPlaceholder="Order number, customer name or email"
        onSearch={(value) => changeParams({ search: value, page: '' })}
      >
        <div className="admin-toolbar-field">
          <Label htmlFor="order-status-filter">Status</Label>
          <Select
            value={status}
            onValueChange={(value) => changeParams({ status: value, page: '' })}
          >
            <SelectTrigger id="order-status-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All</SelectItem>
              {Object.entries(orderStatusLabels).map(([key, label]) => (
                <SelectItem value={key} key={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </AdminFilterToolbar>
      <AdminFeedback loading={loading} error={error} retry={refetch} />
      {!loading && !error && orders && (
        <AdminPageTable
          columns={[
            { label: 'Request' },
            { label: 'Date' },
            { label: 'Status' },
            { label: 'Customer' },
            { label: 'Total', numeric: true },
            { label: 'Details' },
          ]}
          items={orders.items}
          rowKey={(order) => order.id}
          label="order requests"
          emptyMessage="No order requests on this page."
          page={page}
          total={orders.total}
          onPageChange={changePage}
          tableClassName="min-w-[640px]"
          renderRow={(order) => (
            <>
              <TableCell>#{order.id}</TableCell>
              <TableCell>{serverDate(order.createdAt).toLocaleString()}</TableCell>
              <TableCell>
                <OrderStatusBadge status={order.status} paymentStatus={order.payment.status} />
                <PaymentStatus payment={order.payment} />
              </TableCell>
              <TableCell>
                {order.customerName}
                <p className="mt-1 text-xs text-muted-foreground">{order.email}</p>
              </TableCell>
              <TableCell className="admin-numeric">{money(order.totalCents)}</TableCell>
              <TableCell>
                <IconAction asChild label={`View request #${order.id}`} workspace>
                  <Link to={order.id} state={{ returnTo: `/admin/orders?${params}` }}>
                    <Eye aria-hidden="true" />
                  </Link>
                </IconAction>
              </TableCell>
            </>
          )}
        />
      )}
    </section>
  )
}
