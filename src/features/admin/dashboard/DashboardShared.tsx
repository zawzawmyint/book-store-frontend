import { formatDateTime, formatDate, money, serverDate } from '../../../lib/format'
import { localized, t, useI18n } from '../../../lib/i18n'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import { BookLoadingIcon } from '../../../app/components/BookLoader'
import type { DashboardOrderFieldsFragment } from '../../../generated/graphql'
import { Card, CardContent, CardHeader } from '../../../app/components/ui/card'
import {
  Item,
  ItemContent,
  ItemTitle,
  ItemDescription,
  ItemActions,
} from '../../../app/components/ui/item'
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
  useI18n()

  return (
    <section aria-label={localized(title)} className={`min-w-0 ${className}`}>
      <Card className="h-full">
        <CardHeader className="p-4 pb-3">
          <h3 className="text-lg font-semibold">
            <bdi dir="auto">{localized(title)}</bdi>
          </h3>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0">{localized(children)}</CardContent>
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
  useI18n()

  return (
    <Card
      className="dashboard-cue dashboard-metric min-w-0"
      data-tone={tone}
      role="group"
      aria-label={localized(label)}
    >
      <CardContent className="p-3">
        <div className="flex items-center gap-2">
          {Icon && (
            <span className="dashboard-icon shrink-0">
              <Icon size={14} aria-hidden="true" />
            </span>
          )}
          <p className="text-xs text-muted-foreground">{localized(label)}</p>
        </div>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
          <p className="break-words text-xl font-semibold tracking-tight tabular-nums">
            {localized(value)}
          </p>
          {status && <DashboardStatus tone={tone}>{localized(status)}</DashboardStatus>}
        </div>
        {link && (
          <Link to={link} className="mt-1 block text-xs underline underline-offset-4">
            {localized(linkLabel)}
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
  useI18n()

  return (
    <span data-tone={tone} className="dashboard-cue dashboard-status">
      {Icon && <Icon size={12} aria-hidden="true" />}
      {localized(children)}
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
  useI18n()

  return (
    <>
      {loading && hasData && (
        <p role="status" className="sr-only">
          {t('admin:refreshing')}
        </p>
      )}
      {error && hasData && (
        <p className="mb-2 text-sm">{t('admin:showingStaleDataFromTheLastSuccessfulUpdate')}</p>
      )}
      <AdminFeedback loading={loading && !hasData} error={localized(error)} retry={refresh} />
    </>
  )
}
export function UpdatedAt({ value, refreshing = false }: { value: string; refreshing?: boolean }) {
  useI18n()

  return (
    <p className="relative ps-5 text-xs text-muted-foreground">
      {refreshing && <BookLoadingIcon className="absolute left-0 top-0.5 size-3" />}
      {t('admin:lastUpdated', { value0: formatDateTime(serverDate(value)) })}
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
  useI18n()

  return (
    <DashboardPanel title={localized(title)}>
      {!orders.length ? (
        <p className="text-sm text-muted-foreground">{t('admin:noOrdersToShow')}</p>
      ) : detailed ? (
        <div className="overflow-x-auto">
          <Table aria-label={localized(title)}>
            <TableHeader>
              <TableRow>
                <TableHead>{t('admin:order')}</TableHead>
                <TableHead>{t('admin:customer')}</TableHead>
                <TableHead>{t('admin:state')}</TableHead>
                <TableHead>{t('admin:total')}</TableHead>
                <TableHead>{t('admin:details')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    #<bdi dir="ltr">{localized(order.id)}</bdi>
                    <p className="text-xs text-muted-foreground">
                      {localized(formatDate(serverDate(order.createdAt)))}
                    </p>
                  </TableCell>
                  <TableCell>
                    <bdi dir="auto">{localized(order.customerName)}</bdi>
                  </TableCell>
                  <TableCell>
                    <OrderStatusBadge status={order.status} paymentStatus={order.payment.status} />
                    <PaymentStatus payment={order.payment} />
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {localized(money(order.totalCents))}
                  </TableCell>
                  <TableCell>
                    <Link
                      className="underline"
                      to={`/admin/orders/${order.id}`}
                      state={{ returnTo }}
                    >
                      {t('admin:viewOrderValue', { value0: order.id })}
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
            <Item
              asChild
              key={order.id}
              className="flex-wrap justify-between gap-3 rounded-none px-0 py-3"
            >
              <li>
                <ItemContent>
                  <ItemTitle className="text-base">
                    #<bdi dir="ltr">{localized(order.id)}</bdi> ·{' '}
                    <bdi dir="auto">{localized(order.customerName)}</bdi>
                  </ItemTitle>
                  <ItemDescription className="text-xs">
                    {localized(money(order.totalCents))}
                  </ItemDescription>
                </ItemContent>
                <ItemActions>
                  <Link
                    className="text-sm underline"
                    to={`/admin/orders/${order.id}`}
                    state={{ returnTo }}
                  >
                    {t('admin:viewOrderValue', { value0: order.id })}
                  </Link>
                </ItemActions>
              </li>
            </Item>
          ))}
        </ul>
      )}
    </DashboardPanel>
  )
}
