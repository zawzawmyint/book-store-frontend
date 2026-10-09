import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { RefreshCw, type LucideIcon } from 'lucide-react'
import type { DashboardOrderFieldsFragment } from '../../../generated/graphql'
import { Card, CardContent, CardHeader } from '../../../app/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../app/components/ui/table'
import { OrderStatusBadge } from '../../orders/OrderStatusBadge'
import { PaymentStatus } from '../../orders/PaymentStatus'
import { money, serverDate } from '../../../lib/format'
import { AdminFeedback } from '../components/AdminFeedback'

export function DashboardPanel({
  title,
  children,
  className = '',
}: {
  title: string
  children: ReactNode
  className?: string
}) {
  return (
    <section aria-label={title} className={`min-w-0 ${className}`}>
      <Card className="h-full">
        <CardHeader className="p-4 pb-3">
          <h3 className="text-lg font-semibold">{title}</h3>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0">{children}</CardContent>
      </Card>
    </section>
  )
}
export function MetricCard({
  label,
  value,
  link,
  linkLabel,
  icon: Icon,
  tone = 'neutral',
  status,
}: {
  label: string
  value: ReactNode
  link?: string
  linkLabel?: string
  icon?: LucideIcon
  tone?: 'neutral' | 'info' | 'success' | 'warning' | 'danger'
  status?: string
}) {
  return (
    <Card
      className="dashboard-cue dashboard-metric min-w-0"
      data-tone={tone}
      role="group"
      aria-label={label}
    >
      <CardContent className="p-3">
        <div className="flex items-center gap-2">
          {Icon && (
            <span className="dashboard-icon shrink-0">
              <Icon size={14} aria-hidden="true" />
            </span>
          )}
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
          <p className="break-words text-xl font-semibold tracking-tight tabular-nums">{value}</p>
          {status && <DashboardStatus tone={tone}>{status}</DashboardStatus>}
        </div>
        {link && (
          <Link to={link} className="mt-1 block text-xs underline underline-offset-4">
            {linkLabel}
          </Link>
        )}
      </CardContent>
    </Card>
  )
}
export function DashboardStatus({
  tone,
  icon: Icon,
  children,
}: {
  tone: 'neutral' | 'info' | 'success' | 'warning' | 'danger'
  icon?: LucideIcon
  children: ReactNode
}) {
  return (
    <span data-tone={tone} className="dashboard-cue dashboard-status">
      {Icon && <Icon size={12} aria-hidden="true" />}
      {children}
    </span>
  )
}
export function DashboardFeedback({
  loading,
  error,
  hasData,
  refresh,
}: {
  loading: boolean
  error?: Error
  hasData: boolean
  refresh: () => unknown
}) {
  return (
    <>
      {loading && hasData && (
        <p role="status" className="sr-only">
          Refreshing…
        </p>
      )}
      {error && hasData && (
        <p className="mb-2 text-sm">Showing stale data from the last successful update.</p>
      )}
      <AdminFeedback loading={loading && !hasData} error={error} retry={refresh} />
    </>
  )
}
export function UpdatedAt({ value, refreshing = false }: { value: string; refreshing?: boolean }) {
  return (
    <p className="relative pl-5 text-xs text-muted-foreground">
      {refreshing && (
        <RefreshCw
          size={12}
          aria-hidden="true"
          className="absolute left-0 top-0.5 motion-safe:animate-spin"
        />
      )}
      Last updated {serverDate(value).toLocaleString()}
    </p>
  )
}
export function OrderPreview({
  title,
  orders,
  returnTo,
  detailed = false,
}: {
  title: string
  orders: DashboardOrderFieldsFragment[]
  returnTo: string
  detailed?: boolean
}) {
  return (
    <DashboardPanel title={title}>
      {!orders.length ? (
        <p className="text-sm text-muted-foreground">No orders to show.</p>
      ) : detailed ? (
        <div className="overflow-x-auto">
          <Table aria-label={title}>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>State</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    #{order.id}
                    <p className="text-xs text-muted-foreground">
                      {serverDate(order.createdAt).toLocaleDateString()}
                    </p>
                  </TableCell>
                  <TableCell>{order.customerName}</TableCell>
                  <TableCell>
                    <OrderStatusBadge status={order.status} paymentStatus={order.payment.status} />
                    <PaymentStatus payment={order.payment} />
                  </TableCell>
                  <TableCell className="tabular-nums">{money(order.totalCents)}</TableCell>
                  <TableCell>
                    <Link
                      className="underline"
                      to={`/admin/orders/${order.id}`}
                      state={{ returnTo }}
                    >
                      View order #{order.id}
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {orders.map((order) => (
            <li key={order.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
                <p className="font-medium">
                  #{order.id} · {order.customerName}
                </p>
                <p className="text-xs text-muted-foreground">{money(order.totalCents)}</p>
              </div>
              <Link
                className="text-sm underline"
                to={`/admin/orders/${order.id}`}
                state={{ returnTo }}
              >
                View order #{order.id}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </DashboardPanel>
  )
}
