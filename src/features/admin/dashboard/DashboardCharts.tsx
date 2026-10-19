import { formatNumber, formatDate } from '../../../lib/format'
import { localized, message as msg, t, useI18n } from '../../../lib/i18n'
import { Area, Bar, BarChart, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from 'recharts'
import { useNavigate } from 'react-router-dom'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '../../../app/components/ui/chart'
import type { DashboardFinanceQuery, WorkspaceDashboardQuery } from '../../../generated/graphql'
import { exactMoney, plotAmount } from './dashboard-format'

const paymentsConfig = {
  captured: {
    get label() {
      return t('admin:capturedPayments')
    },
    theme: { light: '#166534', dark: '#86efac' },
  },
  refunded: {
    get label() {
      return t('admin:successfulRefunds')
    },
    theme: { light: '#9a3412', dark: '#fdba74' },
  },
} satisfies ChartConfig
const fulfillmentConfig = {
  count: {
    get label() {
      return t('admin:paidOrders')
    },
    theme: { light: '#166534', dark: '#86efac' },
  },
} satisfies ChartConfig
const labels: Record<string, string> = {
  SUBMITTED: msg('admin:awaitingPreparation'),
  PREPARING: msg('admin:preparing'),
  SHIPPED: msg('admin:shipped'),
  DELIVERED: msg('admin:delivered'),
}

export function FulfillmentChart({
  counts,
}: {
  counts: WorkspaceDashboardQuery['workspaceDashboard']['fulfillment']
}) {
  useI18n()

  const navigate = useNavigate()
  const data = counts.map((row) => ({ ...row, label: localized(labels[row.status]) }))
  return (
    <ChartContainer
      config={fulfillmentConfig}
      className="h-[220px] w-full aspect-auto"
      aria-label={t('admin:currentPaidOrdersByFulfillmentStatus')}
    >
      <BarChart accessibilityLayer data={data} layout="vertical" margin={{ left: 0, right: 20 }}>
        <CartesianGrid horizontal={false} />
        <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="label" width={125} tickLine={false} axisLine={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar
          dataKey="count"
          fill="var(--color-count)"
          radius={4}
          isAnimationActive={false}
          cursor="pointer"
          onClick={(entry) => {
            if (entry.payload?.status in labels)
              navigate(`/admin/orders?status=${entry.payload.status}`)
          }}
        />
      </BarChart>
    </ChartContainer>
  )
}

export function PaymentsChart({
  days,
}: {
  days: DashboardFinanceQuery['adminDashboardFinance']['days']
}) {
  useI18n()

  const chartDays = days.map((day) => ({
    ...day,
    captured: plotAmount(day.capturedCents),
    refunded: plotAmount(day.refundedCents),
  }))
  if (chartDays.some((day) => day.captured === null || day.refunded === null))
    return (
      <p className="py-8 text-sm text-muted-foreground">
        {t('admin:theseAmountsExceedTheChartSNumericRangeExactValuesAre')}
      </p>
    )
  if (!days.some((day) => BigInt(day.capturedCents) !== 0n || BigInt(day.refundedCents) !== 0n))
    return (
      <p className="py-8 text-sm text-muted-foreground">
        {t('admin:noRecordedPaymentsOrSuccessfulRefundsInThisPeriod')}
      </p>
    )
  return (
    <>
      <ChartContainer
        config={paymentsConfig}
        className="h-[240px] w-full aspect-auto"
        aria-label={t('admin:dailyCapturedPaymentsAndSuccessfulRefunds')}
      >
        <ComposedChart accessibilityLayer data={chartDays} margin={{ left: 8, right: 12 }}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(value) => formatDate(String(value) + 'T12:00:00')}
            minTickGap={25}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            width={65}
            tickFormatter={(value) =>
              formatNumber(Number(value), {
                notation: 'compact',
                style: 'currency',
                currency: 'USD',
              })
            }
            axisLine={false}
            tickLine={false}
          />
          <ChartTooltip
            content={(props) => {
              const day = props.payload?.[0]?.payload as (typeof chartDays)[number] | undefined
              return props.active && day ? (
                <div className="rounded-lg border border-border bg-background p-3 text-xs shadow-lg">
                  <p className="mb-2 font-medium">{formatDate(day.date + 'T12:00:00')}</p>
                  <p>
                    {t('admin:capturedPaymentsValue', { value0: exactMoney(day.capturedCents) })}
                  </p>
                  <p>
                    {t('admin:successfulRefundsValue', { value0: exactMoney(day.refundedCents) })}
                  </p>
                  <p>{t('admin:paidOrdersValue', { value0: day.paidOrderCount })}</p>
                </div>
              ) : null
            }}
          />
          <Area
            dataKey="captured"
            type="linear"
            fill="var(--color-captured)"
            fillOpacity={0.18}
            stroke="var(--color-captured)"
            strokeWidth={2}
            isAnimationActive={false}
          />
          <Line
            dataKey="refunded"
            type="linear"
            stroke="var(--color-refunded)"
            strokeDasharray="5 4"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ChartContainer>
      <p className="mt-2 text-xs text-muted-foreground">
        {t('admin:solidFilledLineCapturedPaymentsDashedLineSuccessfulRefunds')}
      </p>
    </>
  )
}
