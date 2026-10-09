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
  captured: { label: 'Captured payments', theme: { light: '#166534', dark: '#86efac' } },
  refunded: { label: 'Successful refunds', theme: { light: '#9a3412', dark: '#fdba74' } },
} satisfies ChartConfig
const fulfillmentConfig = {
  count: { label: 'Paid orders', theme: { light: '#166534', dark: '#86efac' } },
} satisfies ChartConfig
const labels: Record<string, string> = {
  SUBMITTED: 'Awaiting preparation',
  PREPARING: 'Preparing',
  SHIPPED: 'Shipped',
  DELIVERED: 'Delivered',
}

export function FulfillmentChart({
  counts,
}: {
  counts: WorkspaceDashboardQuery['workspaceDashboard']['fulfillment']
}) {
  const navigate = useNavigate()
  const data = counts.map((row) => ({ ...row, label: labels[row.status] }))
  return (
    <ChartContainer
      config={fulfillmentConfig}
      className="h-[220px] w-full aspect-auto"
      aria-label="Current paid orders by fulfillment status"
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
  const chartDays = days.map((day) => ({
    ...day,
    captured: plotAmount(day.capturedCents),
    refunded: plotAmount(day.refundedCents),
  }))
  if (chartDays.some((day) => day.captured === null || day.refunded === null))
    return (
      <p className="py-8 text-sm text-muted-foreground">
        These amounts exceed the chart's numeric range. Exact values are available in the summary
        and daily table.
      </p>
    )
  if (!days.some((day) => BigInt(day.capturedCents) !== 0n || BigInt(day.refundedCents) !== 0n))
    return (
      <p className="py-8 text-sm text-muted-foreground">
        No recorded payments or successful refunds in this period.
      </p>
    )
  return (
    <>
      <ChartContainer
        config={paymentsConfig}
        className="h-[240px] w-full aspect-auto"
        aria-label="Daily captured payments and successful refunds"
      >
        <ComposedChart accessibilityLayer data={chartDays} margin={{ left: 8, right: 12 }}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(value) => String(value).slice(5)}
            minTickGap={25}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            width={65}
            tickFormatter={(value) =>
              `$${Number(value).toLocaleString('en-US', { notation: 'compact' })}`
            }
            axisLine={false}
            tickLine={false}
          />
          <ChartTooltip
            content={(props) => {
              const day = props.payload?.[0]?.payload as (typeof chartDays)[number] | undefined
              return props.active && day ? (
                <div className="rounded-lg border border-border bg-background p-3 text-xs shadow-lg">
                  <p className="mb-2 font-medium">{day.date}</p>
                  <p>Captured payments: {exactMoney(day.capturedCents)}</p>
                  <p>Successful refunds: {exactMoney(day.refundedCents)}</p>
                  <p>Paid orders: {day.paidOrderCount}</p>
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
        Solid filled line: captured payments · Dashed line: successful refunds
      </p>
    </>
  )
}
