import { AdminPageTable } from '../components/AdminPageTable'
import { AdminPageHeader } from '../components/AdminPageHeader'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@apollo/client/react'
import { AdminOrdersDocument } from '../../../generated/graphql'
import { money } from '../../../lib/format'
import { IconAction } from '../../../app/components/IconAction'
import { Eye } from 'lucide-react'
import { TableCell } from '../../../app/components/ui/table'
import { Badge } from '../../../app/components/ui/badge'
import { useAdminQueryError } from '../admin-access'
import { ADMIN_PAGE_SIZE, readPage } from '../admin-data'
import { AdminFeedback } from '../components/AdminFeedback'

export function OrdersPage() {
  const [params, setParams] = useSearchParams()
  const page = readPage(params.get('page'))
  const { data, loading, error, refetch } = useQuery(AdminOrdersDocument, {
    variables: { limit: ADMIN_PAGE_SIZE, offset: (page - 1) * ADMIN_PAGE_SIZE },
    fetchPolicy: 'no-cache',
  })
  useAdminQueryError(error)
  const orders = data?.adminOrders
  return (
    <section>
      <AdminPageHeader
        title="All order requests"
        description="Saved requests only. No payment or shipping is recorded."
      />
      <AdminFeedback loading={loading} error={error} retry={refetch} />
      {!loading && !error && orders && (
        <AdminPageTable
          columns={[
            { label: 'Request' },
            { label: 'Date' },
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
          onPageChange={(next) => setParams({ page: String(next) })}
          tableClassName="min-w-[640px]"
          renderRow={(order) => (
            <>
              <TableCell>#{order.id}</TableCell>
              <TableCell>{order.createdAt}</TableCell>
              <TableCell>
                {order.customerName}
                <p className="mt-1 text-xs text-muted-foreground">{order.email}</p>
                {!order.userId && <Badge variant="secondary">Legacy guest request</Badge>}
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
