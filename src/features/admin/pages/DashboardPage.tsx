import { localized, message as msg, t, useI18n } from '../../../lib/i18n'
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
  SUBMITTED: msg('admin:awaitingPreparation'),
  PREPARING: msg('admin:preparing'),
  SHIPPED: msg('admin:shipped'),
  DELIVERED: msg('admin:delivered'),
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
  useI18n()

  const { data, loading, error, refetch } = useQuery(AdminBookDocument, {
    variables: { id },
    fetchPolicy: 'no-cache',
  })
  useAdminQueryError(error)
  if (data?.adminBook) return <StockDialog book={data.adminBook} close={close} saved={saved} />
  return (
    <div>
      <AdminFeedback loading={loading} error={localized(error)} retry={refetch} />
      <Button variant="ghost" onClick={close}>
        {t('admin:cancelStockAdjustment')}
      </Button>
    </div>
  )
}

export default function DashboardPage() {
  useI18n()

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
        {t('admin:paymentPeriod')}
        <select
          aria-label={t('admin:paymentPeriod')}
          className="rounded-md border border-input bg-background px-3 py-2"
          value={periodValue}
          onChange={(event) => {
            const next = new URLSearchParams(params)
            next.set('period', event.target.value)
            setParams(next)
          }}
        >
          <option value="7">{t('admin:last7Days')}</option>
          <option value="30">{t('admin:last30Days')}</option>
          <option value="90">{t('admin:last90Days')}</option>
        </select>
      </label>
    ) : null
  const fulfillmentPanel = dashboard ? (
    <DashboardPanel title={t('admin:currentFulfillment')}>
      <p className="mb-2 text-sm text-muted-foreground">
        {t('admin:paidOrdersWithoutAPendingCancellationCurrentCountsIndependentOfPayment')}
      </p>
      <FulfillmentChart counts={dashboard.fulfillment} />
      <ul className="mt-3 grid grid-cols-2 gap-2 text-sm">
        {dashboard.fulfillment.map((row) => (
          <li key={row.status}>
            <p>
              {localized(fulfillmentLabels[row.status])}: <strong>{localized(row.count)}</strong>
            </p>
            <Link className="text-xs underline" to={`/admin/orders?status=${row.status}`}>
              {t('admin:allOrdersInThisStatus')}
            </Link>
          </li>
        ))}
      </ul>
    </DashboardPanel>
  ) : null
  return (
    <section className="space-y-4">
      <AdminPageHeader
        title={t('admin:dashboard')}
        description={t('admin:aClearViewOfYourStoreAndWhatNeedsAttention')}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            {localized(periodControl)}
            <Button
              variant="outline"
              aria-label={t('admin:refreshDashboard')}
              onClick={() => {
                void state.refresh()
                setRefreshKey((key) => key + 1)
              }}
            >
              <RefreshCw size={16} aria-hidden="true" /> {t('admin:refresh')}
            </Button>
          </div>
        }
      />
      {notice && (
        <p role="status" className="text-sm">
          {localized(notice)}
        </p>
      )}
      <DashboardFeedback {...state} hasData={!!dashboard} />
      {dashboard && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium">{t('admin:currentOperations')}</p>
            <UpdatedAt value={dashboard.generatedAt} refreshing={state.loading} />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
            {dashboard.fulfillment
              .filter((row) => row.status !== 'DELIVERED')
              .map((row) => (
                <MetricCard
                  key={row.status}
                  label={localized(fulfillmentLabels[row.status])}
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
                      ? t('admin:nothingPending')
                      : row.status === 'SUBMITTED'
                        ? t('admin:needsAttention')
                        : row.status === 'PREPARING'
                          ? t('admin:inProgress')
                          : t('admin:onTheWay')
                  }
                  link={`/admin/orders?status=${row.status}`}
                  linkLabel={msg('admin:allOrdersInThisStatus')}
                />
              ))}
            <MetricCard
              label={t('admin:lowStock15')}
              value={dashboard.lowStockCount}
              icon={TriangleAlert}
              tone={dashboard.lowStockCount > 0 ? 'warning' : 'neutral'}
              status={
                dashboard.lowStockCount > 0 ? t('admin:needsRestocking') : t('admin:noIssues')
              }
              link="/admin/books?low=true"
              linkLabel={msg('admin:viewLowAndOutOfStockBooks')}
            />
            <MetricCard
              label={t('admin:outOfStock')}
              value={dashboard.outOfStockCount}
              icon={CircleAlert}
              tone={dashboard.outOfStockCount > 0 ? 'danger' : 'neutral'}
              status={dashboard.outOfStockCount > 0 ? t('admin:needsAction') : t('admin:noIssues')}
              link="/admin/books?low=true"
              linkLabel={msg('admin:viewLowAndOutOfStockBooks')}
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
      {localized(role !== 'ADMIN' && fulfillmentPanel)}
      {dashboard && (
        <>
          <div>
            <DashboardPanel title={t('admin:stockAlerts')}>
              <p className="mb-3 text-sm text-muted-foreground">
                {t('admin:activeBooksWithFiveOrFewerCopiesLowestStockFirst')}
              </p>
              {!dashboard.stockAlerts.length ? (
                <p className="text-sm">{t('admin:noStockAlerts')}</p>
              ) : (
                <ul className="divide-y divide-border">
                  {dashboard.stockAlerts.map((book) => (
                    <li
                      key={book.id}
                      className="flex flex-wrap items-center justify-between gap-3 py-3"
                    >
                      <div className="min-w-0">
                        <p className="font-medium">
                          <bdi dir="auto">{localized(book.title)}</bdi>
                        </p>
                        <p className="mb-1 text-sm text-muted-foreground">
                          <span data-testid="stock-count" data-count={book.stock}>
                            {t('common:copyCount', { count: book.stock })}
                          </span>
                        </p>
                        <DashboardStatus
                          tone={book.stock === 0 ? 'danger' : 'warning'}
                          icon={book.stock === 0 ? CircleAlert : TriangleAlert}
                        >
                          {localized(
                            book.stock === 0 ? t('admin:outOfStock') : t('admin:needsRestocking'),
                          )}
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
                        {t('admin:adjustStock')}
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </DashboardPanel>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <OrderPreview
              title={t('admin:awaitingPreparation')}
              orders={dashboard.awaitingPreparation}
              returnTo={returnTo}
            />
            <OrderPreview
              title={t('admin:readyToShip')}
              orders={dashboard.readyToShip}
              returnTo={returnTo}
            />
          </div>
          <OrderPreview
            title={t('admin:recentOrders')}
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
