import { useEffect, useState } from 'react'
import { useApolloClient, useQuery } from '@apollo/client/react'
import { Link, useNavigate } from 'react-router-dom'
import { MY_ORDERS } from '../../../lib/graphql'
import { money } from '../../../lib/format'
import { PageContainer } from '../../../app/components/PageContainer'
import { Alert, AlertDescription } from '../../../app/components/ui/alert'
import { Button } from '../../../app/components/ui/button'
import { Card, CardContent, CardHeader } from '../../../app/components/ui/card'
import { Separator } from '../../../app/components/ui/separator'
import { Skeleton } from '../../../app/components/ui/skeleton'
import { signInPath } from '../../auth/return-to'

const pageSize = 20

export function OrdersPage() {
  const [page, setPage] = useState(0)
  const navigate = useNavigate()
  const client = useApolloClient()
  const { data, loading, error } = useQuery(MY_ORDERS, {
    variables: { limit: pageSize, offset: page * pageSize },
    fetchPolicy: 'no-cache',
  })
  const unauthenticated =
    error &&
    'errors' in error &&
    (error as { errors?: Array<{ extensions?: { code?: string } }> }).errors?.some(
      (entry) => entry.extensions?.code === 'UNAUTHENTICATED',
    )

  useEffect(() => {
    if (unauthenticated)
      void client
        .clearStore()
        .then(() => navigate(signInPath('/account/orders'), { replace: true }))
  }, [unauthenticated, client, navigate])

  if (unauthenticated)
    return (
      <div role="status" className="py-24 text-center">
        Please sign in again…
      </div>
    )

  const orders = data?.myOrders
  return (
    <PageContainer className="py-12 sm:py-20">
      <p className="eyebrow mb-3">Your account</p>
      <h1 className="font-serif text-5xl">Your orders</h1>
      <p className="mt-4 text-sm text-[#778073]">
        Your saved order requests. No payment was collected.
      </p>
      {loading && (
        <div role="status" aria-label="Loading your orders" className="mt-10 space-y-6">
          <span className="sr-only">Loading your orders…</span>
          <Skeleton className="h-32 w-full bg-[#e8e5dc]" />
          <Skeleton className="h-32 w-full bg-[#e8e5dc]" />
        </div>
      )}
      {error && !unauthenticated && (
        <Alert variant="destructive" className="mt-10 border-[#e5c9c0] bg-[#fff2ed] text-[#a14134]">
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}
      {!loading && !error && orders?.items.length === 0 && (
        <div className="mt-12">
          <p>No order requests yet.</p>
          <Button asChild variant="ghost" className="mt-3 text-[#28674a] underline">
            <Link to="/">Browse books</Link>
          </Button>
        </div>
      )}
      {!loading && !error && orders && orders.items.length > 0 && (
        <>
          <div className="mt-10 space-y-6">
            {orders.items.map((order) => (
              <Card key={order.id} className="border-[#d8d5ca] bg-[#f2efe7] shadow-none">
                <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-4">
                  <div>
                      <h2 className="font-serif text-2xl">Order #{order.id}</h2>
                    <p className="mt-1 text-xs text-[#778073]">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <strong>{money(order.totalCents)}</strong>
                </CardHeader>
                <CardContent>
                  <Separator className="mb-4 bg-[#d8d5ca]" />
                  <ul className="space-y-2 text-sm">
                    {order.items.map((item, index) => (
                      <li key={`${order.id}-${index}`} className="flex justify-between gap-4">
                        <span>
                          {item.quantity} × {item.title}
                        </span>
                        <span>{money(item.quantity * item.unitPriceCents)}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="mt-8 flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="ghost"
              disabled={page === 0}
              onClick={() => setPage((current) => current - 1)}
            >
              Previous
            </Button>
            <span className="text-sm text-[#778073]">
              Page {page + 1} of {Math.ceil(orders.total / pageSize)}
            </span>
            <Button
              type="button"
              variant="ghost"
              disabled={(page + 1) * pageSize >= orders.total}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
            </Button>
          </div>
        </>
      )}
    </PageContainer>
  )
}
