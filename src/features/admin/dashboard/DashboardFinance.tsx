import { useMemo, type ReactNode } from 'react'
import { Coins, Undo2, Wallet, PackageCheck } from 'lucide-react'
import type { DashboardPeriod } from '../../../generated/graphql'
import { DashboardFinanceDocument } from '../../../generated/graphql'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../app/components/ui/table'
import { useDashboardQuery } from './use-dashboard-query'
import {
  DashboardFeedback,
  DashboardPanel,
  MetricCard,
  OrderPreview,
  UpdatedAt,
} from './DashboardShared'
import { PaymentsChart } from './DashboardCharts'
import { exactMoney } from './dashboard-format'

export function DashboardFinance({
  period,
  refreshKey,
  returnTo,
  fulfillment,
}: {
  period: DashboardPeriod
  refreshKey: number
  returnTo: string
  fulfillment: ReactNode
}) {
  const variables = useMemo(() => ({ period }), [period])
  const state = useDashboardQuery(DashboardFinanceDocument, variables, refreshKey)
  const finance = state.data?.adminDashboardFinance
  return (
    <section aria-label="Financial overview" className="space-y-4">
      <DashboardFeedback {...state} hasData={!!finance} />
      {!finance && fulfillment}
      {finance && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-medium">Financial overview</h3>
            <UpdatedAt value={finance.generatedAt} refreshing={state.loading} />
          </div>
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <MetricCard
              label="Captured payments"
              value={exactMoney(finance.capturedCents)}
              icon={Coins}
            />
            <MetricCard
              label="Successful refunds"
              value={exactMoney(finance.refundedCents)}
              icon={Undo2}
            />
            <MetricCard label="Net captured" value={exactMoney(finance.netCents)} icon={Wallet} />
            <MetricCard label="Paid orders" value={finance.paidOrderCount} icon={PackageCheck} />
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            {fulfillment}
            <DashboardPanel title="Recorded payments">
              <p className="mb-4 text-sm text-muted-foreground">
                {finance.startDate} – {finance.endDate} · {finance.currency.toUpperCase()} ·{' '}
                {finance.timeZone}. Today is partial.
              </p>
              <PaymentsChart days={finance.days} />
              <p className="my-4 text-xs text-muted-foreground">
                Test payments include delivery fees. Net captured subtracts successful refunds; it
                is not profit.
              </p>
              <details className="rounded-lg border border-border p-3">
                <summary className="cursor-pointer text-sm font-medium">View daily values</summary>
                <div className="mt-3 max-h-80 overflow-auto">
                  <Table aria-label="Daily recorded payments">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Captured</TableHead>
                        <TableHead>Refunded</TableHead>
                        <TableHead>Paid orders</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {finance.days.map((day) => (
                        <TableRow key={day.date}>
                          <TableCell className="whitespace-nowrap">
                            {day.date}
                            {day.date === finance.endDate ? ' (partial)' : ''}
                          </TableCell>
                          <TableCell className="tabular-nums">
                            {exactMoney(day.capturedCents)}
                          </TableCell>
                          <TableCell className="tabular-nums">
                            {exactMoney(day.refundedCents)}
                          </TableCell>
                          <TableCell>{day.paidOrderCount}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </details>
            </DashboardPanel>
          </div>
          <p className="text-sm text-muted-foreground">
            Current failed refunds:{' '}
            <strong className="text-foreground">{finance.failedRefundCount}</strong> · independent
            of the selected period.
          </p>
          <OrderPreview
            title="Current failed refunds"
            orders={finance.failedRefundOrders}
            returnTo={returnTo}
          />
        </>
      )}
    </section>
  )
}
