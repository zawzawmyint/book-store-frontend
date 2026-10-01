import { Link, useLocation, useParams } from 'react-router-dom'
import { useQuery } from '@apollo/client/react'
import { AdminOrderDocument } from '../../../generated/graphql'
import { money } from '../../../lib/format'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../app/components/ui/card'
import { Badge } from '../../../app/components/ui/badge'
import { Separator } from '../../../app/components/ui/separator'
import { useAdminQueryError } from '../admin-access'
import { AdminFeedback } from '../components/AdminFeedback'

export function OrderPage() {
  const { id = '' } = useParams()
  const valid = /^[1-9]\d*$/.test(id) && Number.isSafeInteger(Number(id))
  const { data, loading, error, refetch } = useQuery(AdminOrderDocument, {
    variables: { id },
    skip: !valid,
    fetchPolicy: 'no-cache',
  })
  useAdminQueryError(error)
  const location = useLocation()
  const requestedReturn = (location.state as { returnTo?: string } | null)?.returnTo
  const returnTo = requestedReturn?.startsWith('/admin/orders?') ? requestedReturn : '/admin/orders'
  const order = data?.adminOrder
  return (
    <section>
      <Link className="underline" to={returnTo}>
        Back to order requests
      </Link>
      <AdminFeedback loading={loading} error={error} retry={refetch} />
      {!loading && !error && (!valid || !order) && (
        <h2 className="mt-6 font-serif text-3xl">Order request not found</h2>
      )}
      {!loading && !error && order && (
        <Card className="mt-6 max-w-3xl">
          <CardHeader>
            <CardTitle>Order request #{order.id}</CardTitle>
            <CardDescription>{order.createdAt}</CardDescription>
            <p>{order.customerName} · {order.email}</p>
            {!order.userId && <Badge variant="secondary" className="w-fit">Legacy guest request</Badge>}
          </CardHeader>
          <CardContent>
          <ul className="space-y-4">
            {order.items.map((line, index) => (
              <li
                key={index}
                className="flex flex-wrap justify-between gap-3 pb-3"
              >
                <span>
                  {line.quantity} × {line.title}
                  <small className="block">{money(line.unitPriceCents)} each</small>
                </span>
                <strong>{money(line.quantity * line.unitPriceCents)}</strong>
                <Separator />
              </li>
            ))}
          </ul>
          <p className="mt-6 text-xl font-bold">Total: {money(order.totalCents)}</p>
          <p className="mt-4 text-sm">
            This is an order request. No payment or shipping is recorded.
          </p>
          </CardContent>
        </Card>
      )}
    </section>
  )
}
