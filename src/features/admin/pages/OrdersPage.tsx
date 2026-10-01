import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@apollo/client/react'
import { AdminOrdersDocument } from '../../../generated/graphql'
import { money } from '../../../lib/format'
import { Button } from '../../../app/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../app/components/ui/table'
import { Badge } from '../../../app/components/ui/badge'
import { useAdminQueryError } from '../admin-access'
import { readPage } from '../admin-data'
import { AdminFeedback, AdminPagination } from '../components/AdminFeedback'

export function OrdersPage() {
  const [params, setParams] = useSearchParams()
  const page = readPage(params.get('page'))
  const { data, loading, error, refetch } = useQuery(AdminOrdersDocument, {
    variables: { limit: 20, offset: (page - 1) * 20 },
    fetchPolicy: 'no-cache',
  })
  useAdminQueryError(error)
  const orders = data?.adminOrders
  return (
    <section>
      <h2 className="font-serif text-3xl">All order requests</h2>
      <p className="my-4 text-sm">Saved requests only. No payment or shipping is recorded.</p>
      <AdminFeedback loading={loading} error={error} retry={refetch} />
      {!loading && !error && orders && (
        <>
          {orders.items.length === 0 ? (
            <p>No order requests on this page.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[640px]">
                <TableHeader>
                  <TableRow>
                    {['Request', 'Date', 'Customer', 'Total', 'Details'].map((label) => (
                      <TableHead key={label} scope="col">
                        {label}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.items.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>#{order.id}</TableCell>
                      <TableCell>{order.createdAt}</TableCell>
                      <TableCell>
                        {order.customerName}
                        <p>{order.email}</p>
                        {!order.userId && <Badge variant="secondary">Legacy guest request</Badge>}
                      </TableCell>
                      <TableCell>{money(order.totalCents)}</TableCell>
                      <TableCell><Button asChild variant="ghost"><Link to={order.id} state={{ returnTo: `/admin/orders?${params}` }}>View request</Link></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <AdminPagination
            page={page}
            total={orders.total}
            change={(next) => setParams({ page: String(next) })}
          />
        </>
      )}
    </section>
  )
}
