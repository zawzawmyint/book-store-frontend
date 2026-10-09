import { useEffect, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { useQuery } from '@apollo/client/react'
import { RefreshCw, Clock3, Package, Truck, TriangleAlert, CircleAlert } from 'lucide-react'
import { WorkspaceDashboardDocument, AdminBookDocument } from '../../../generated/graphql'
import { Button } from '../../../app/components/ui/button'
import { AdminPageHeader } from '../components/AdminPageHeader'
import { AdminFeedback } from '../components/AdminFeedback'
import { StockDialog } from '../components/StockDialog'
import { useAdminAccess, useAdminQueryError } from '../admin-access'
import { useDashboardQuery } from '../dashboard/use-dashboard-query'
import {
  DashboardFeedback,
  DashboardPanel,
  MetricCard,
  OrderPreview,
  UpdatedAt,
  DashboardStatus,
} from '../dashboard/DashboardShared'
import { DashboardFinance } from '../dashboard/DashboardFinance'
import { FulfillmentChart } from '../dashboard/DashboardCharts'
import { dashboardPeriod } from '../dashboard/dashboard-format'

const noVariables = {}
const fulfillmentLabels: Record<string, string> = {
  SUBMITTED: 'Awaiting preparation',
  PREPARING: 'Preparing',
  SHIPPED: 'Shipped',
  DELIVERED: 'Delivered',
}

function DashboardStockDialog({
  id,
  close,
  saved,
}: {
  id: string
  close: () => void
  saved: (message: string) => void
}) {
  const { data, loading, error, refetch } = useQuery(AdminBookDocument, {
    variables: { id },
    fetchPolicy: 'no-cache',
  })
  useAdminQueryError(error)
  if (data?.adminBook) return <StockDialog book={data.adminBook} close={close} saved={saved} />
  return (
    <div>
      <AdminFeedback loading={loading} error={error} retry={refetch} />
      <Button variant="ghost" onClick={close}>
        Cancel stock adjustment
      </Button>
    </div>
  )
}

export default function DashboardPage() {
  const { role } = useAdminAccess()
  const [params, setParams] = useSearchParams()
  const location = useLocation()
  const [refreshKey, setRefreshKey] = useState(0)
  const [stockId, setStockId] = useState<string>()
  const [notice, setNotice] = useState('')
  const period = dashboardPeriod(params.get('period'))
  const periodValue = period === 'DAYS_7' ? '7' : period === 'DAYS_90' ? '90' : '30'
  const state = useDashboardQuery(WorkspaceDashboardDocument, noVariables, 0)
  const dashboard = state.data?.workspaceDashboard
  const returnTo = '/admin' + location.search
  useEffect(() => {
    if (params.has('period') && !['7', '30', '90'].includes(params.get('period')!)) {
      const next = new URLSearchParams(params)
      next.set('period', '30')
      setParams(next, { replace: true })
    }
  }, [params, setParams])
  const periodControl =
    role === 'ADMIN' ? (
      <label className="flex items-center gap-2 text-sm">
        Payment period
        <select
          aria-label="Payment period"
          className="rounded-md border border-input bg-background px-3 py-2"
          value={periodValue}
          onChange={(event) => {
            const next = new URLSearchParams(params)
            next.set('period', event.target.value)
            setParams(next)
          }}
        >
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </select>
      </label>
    ) : null
  const fulfillmentPanel = dashboard ? (
    <DashboardPanel title="Current fulfillment">
      <p className="mb-2 text-sm text-muted-foreground">
        Paid orders without a pending cancellation. Current counts, independent of payment period.
      </p>
      <FulfillmentChart counts={dashboard.fulfillment} />
      <ul className="mt-3 grid grid-cols-2 gap-2 text-sm">
        {dashboard.fulfillment.map((row) => (
          <li key={row.status}>
            <p>
              {fulfillmentLabels[row.status]}: <strong>{row.count}</strong>
            </p>
            <Link className="text-xs underline" to={`/admin/orders?status=${row.status}`}>
              All orders in this status
            </Link>
          </li>
        ))}
      </ul>
    </DashboardPanel>
  ) : null
  return (
    <section className="space-y-4">
      <AdminPageHeader
        title="Dashboard"
        description="A clear view of your store and what needs attention."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            {periodControl}
            <Button
              variant="outline"
              aria-label="Refresh dashboard"
              onClick={() => {
                void state.refresh()
                setRefreshKey((key) => key + 1)
              }}
            >
              <RefreshCw size={16} aria-hidden="true" /> Refresh
            </Button>
          </div>
        }
      />
      {notice && (
        <p role="status" className="text-sm">
          {notice}
        </p>
      )}
      <DashboardFeedback {...state} hasData={!!dashboard} />
      {dashboard && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium">Current operations</p>
            <UpdatedAt value={dashboard.generatedAt} refreshing={state.loading} />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
            {dashboard.fulfillment
              .filter((row) => row.status !== 'DELIVERED')
              .map((row) => (
                <MetricCard
                  key={row.status}
                  label={fulfillmentLabels[row.status]}
                  value={row.count}
                  icon={
                    row.status === 'SUBMITTED'
                      ? Clock3
                      : row.status === 'PREPARING'
                        ? Package
                        : Truck
                  }
                  tone={
                    row.count === 0
                      ? 'neutral'
                      : row.status === 'SUBMITTED'
                        ? 'warning'
                        : row.status === 'PREPARING'
                          ? 'info'
                          : 'success'
                  }
                  status={
                    row.count === 0
                      ? 'Nothing pending'
                      : row.status === 'SUBMITTED'
                        ? 'Needs attention'
                        : row.status === 'PREPARING'
                          ? 'In progress'
                          : 'On the way'
                  }
                  link={`/admin/orders?status=${row.status}`}
                  linkLabel="All orders in this status"
                />
              ))}
            <MetricCard
              label="Low stock (1–5)"
              value={dashboard.lowStockCount}
              icon={TriangleAlert}
              tone={dashboard.lowStockCount > 0 ? 'warning' : 'neutral'}
              status={dashboard.lowStockCount > 0 ? 'Needs restocking' : 'No issues'}
              link="/admin/books?low=true"
              linkLabel="View low and out-of-stock books"
            />
            <MetricCard
              label="Out of stock"
              value={dashboard.outOfStockCount}
              icon={CircleAlert}
              tone={dashboard.outOfStockCount > 0 ? 'danger' : 'neutral'}
              status={dashboard.outOfStockCount > 0 ? 'Needs action' : 'No issues'}
              link="/admin/books?low=true"
              linkLabel="View low and out-of-stock books"
            />
          </div>
        </>
      )}
      {role === 'ADMIN' && (
        <>
          <DashboardFinance
            key={period}
            period={period}
            refreshKey={refreshKey}
            returnTo={returnTo}
            fulfillment={fulfillmentPanel}
          />
        </>
      )}
      {role !== 'ADMIN' && fulfillmentPanel}
      {dashboard && (
        <>
          <div>
            <DashboardPanel title="Stock alerts">
              <p className="mb-3 text-sm text-muted-foreground">
                Active books with five or fewer copies. Lowest stock first.
              </p>
              {!dashboard.stockAlerts.length ? (
                <p className="text-sm">No stock alerts.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {dashboard.stockAlerts.map((book) => (
                    <li
                      key={book.id}
                      className="flex flex-wrap items-center justify-between gap-3 py-3"
                    >
                      <div className="min-w-0">
                        <p className="font-medium">{book.title}</p>
                        <p className="mb-1 text-sm text-muted-foreground">
                          <span data-testid="stock-count">{book.stock}</span> copies
                        </p>
                        <DashboardStatus
                          tone={book.stock === 0 ? 'danger' : 'warning'}
                          icon={book.stock === 0 ? CircleAlert : TriangleAlert}
                        >
                          {book.stock === 0 ? 'Out of stock' : 'Needs restocking'}
                        </DashboardStatus>
                      </div>
                      <Button
                        variant="outline"
                        className="text-xs"
                        onClick={() => {
                          setNotice('')
                          setStockId(book.id)
                        }}
                      >
                        Adjust stock
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </DashboardPanel>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <OrderPreview
              title="Awaiting preparation"
              orders={dashboard.awaitingPreparation}
              returnTo={returnTo}
            />
            <OrderPreview
              title="Ready to ship"
              orders={dashboard.readyToShip}
              returnTo={returnTo}
            />
          </div>
          <OrderPreview
            title="Recent orders"
            orders={dashboard.recentOrders}
            returnTo={returnTo}
            detailed
          />
        </>
      )}
      {stockId && (
        <DashboardStockDialog
          id={stockId}
          close={() => setStockId(undefined)}
          saved={(message) => {
            setStockId(undefined)
            setNotice(message)
            void state.refresh(true)
          }}
        />
      )}
    </section>
  )
}
