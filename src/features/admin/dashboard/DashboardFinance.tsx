import { localized, t, useI18n } from '../../../lib/i18n'
import { formatDate } from '../../../lib/format'
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
  useI18n()

  const variables = useMemo(() => ({ period }), [period])
  const state = useDashboardQuery(DashboardFinanceDocument, variables, refreshKey)
  const finance = state.data?.adminDashboardFinance
  return (
    <section aria-label={t('admin:financialOverview')} className="space-y-4">
      <DashboardFeedback {...state} hasData={!!finance} />
      {localized(!finance && fulfillment)}
      {finance && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-medium">{t('admin:financialOverview')}</h3>
            <UpdatedAt value={finance.generatedAt} refreshing={state.loading} />
          </div>
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <MetricCard
              label={t('admin:capturedPayments')}
              value={exactMoney(finance.capturedCents)}
              icon={Coins}
            />
            <MetricCard
              label={t('admin:successfulRefunds')}
              value={exactMoney(finance.refundedCents)}
              icon={Undo2}
            />
            <MetricCard
              label={t('admin:netCaptured')}
              value={exactMoney(finance.netCents)}
              icon={Wallet}
            />
            <MetricCard
              label={t('admin:paidOrders')}
              value={finance.paidOrderCount}
              icon={PackageCheck}
            />
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            {localized(fulfillment)}
            <DashboardPanel title={t('admin:recordedPayments')}>
              <p className="mb-4 text-sm text-muted-foreground">
                {t('admin:valueValueValueValueValueTodayIsPartial', {
                  value0: formatDate(finance.startDate + 'T12:00:00'),
                  value1: formatDate(finance.endDate + 'T12:00:00'),
                  value2: finance.currency.toUpperCase(),
                  value3: ' ',
                  value4: finance.timeZone,
                })}
              </p>
              <PaymentsChart days={finance.days} />
              <p className="my-4 text-xs text-muted-foreground">
                {t('admin:testPaymentsIncludeDeliveryFeesNetCapturedSubtractsSuccessfulRefundsIt')}
              </p>
              <details className="rounded-lg border border-border p-3">
                <summary className="cursor-pointer text-sm font-medium">
                  {t('admin:viewDailyValues')}
                </summary>
                <div className="mt-3 max-h-80 overflow-auto">
                  <Table aria-label={t('admin:dailyRecordedPayments')}>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('admin:date')}</TableHead>
                        <TableHead>{t('admin:captured')}</TableHead>
                        <TableHead>{t('admin:refunded')}</TableHead>
                        <TableHead>{t('admin:paidOrders')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {finance.days.map((day) => (
                        <TableRow key={day.date}>
                          <TableCell className="whitespace-nowrap">
                            {formatDate(day.date + 'T12:00:00')}
                            {day.date === finance.endDate && t('admin:partialDay')}
                          </TableCell>
                          <TableCell className="tabular-nums">
                            {localized(exactMoney(day.capturedCents))}
                          </TableCell>
                          <TableCell className="tabular-nums">
                            {localized(exactMoney(day.refundedCents))}
                          </TableCell>
                          <TableCell>{localized(day.paidOrderCount)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </details>
            </DashboardPanel>
          </div>
          <p className="text-sm text-muted-foreground">
            {t('admin:currentFailedRefunds')}
            <strong className="text-foreground">{localized(finance.failedRefundCount)}</strong>{' '}
            {t('admin:independentOfTheSelectedPeriod')}
          </p>
          <OrderPreview
            title={t('admin:currentFailedRefunds2')}
            orders={finance.failedRefundOrders}
            returnTo={returnTo}
          />
        </>
      )}
    </section>
  )
}
