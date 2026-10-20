import { formatDateTime, money, serverDate } from '../../../lib/format'
import { localized, t, useI18n } from '../../../lib/i18n'
import { PaymentStatus } from '../../orders/PaymentStatus'
import { OrderStatusBadge } from '../../orders/OrderStatusBadge'
import { orderStatusLabels } from '../../orders/order-status'
import type { OrderStatusFilter } from '../../../generated/graphql'
import { Label } from '../../../app/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../app/components/ui/select'
import { AdminDataTable, type AdminDataColumn } from '../components/AdminPageTable'
import { AdminPageHeader } from '../components/AdminPageHeader'
import { AdminFilterToolbar } from '../components/AdminFilterToolbar'
import { Link } from 'react-router-dom'
import { useQuery } from '@apollo/client/react'
import { AdminOrdersDocument } from '../../../generated/graphql'
import { IconAction } from '../../../app/components/IconAction'
import { Eye } from 'lucide-react'
import { useAdminQueryError } from '../admin-access'
import { useAdminPagination, useAdminPageCorrection } from '../use-admin-pagination'
import { AdminFeedback } from '../components/AdminFeedback'

export function OrdersPage() {
  useI18n()

  const { params, page, limit, offset, changePage, changeParams } = useAdminPagination()
  const search = (params.get('search') ?? '').slice(0, 100).trim()
  const value = params.get('status') ?? 'ALL'
  const status: OrderStatusFilter = Object.hasOwn(orderStatusLabels, value)
    ? (value as OrderStatusFilter)
    : 'ALL'
  const { data, loading, error, refetch } = useQuery(AdminOrdersDocument, {
    variables: {
      ...(search ? { search } : {}),
      status,
      limit,
      offset,
    },
    fetchPolicy: 'no-cache',
  })
  useAdminQueryError(error)
  const orders = data?.adminOrders
  useAdminPageCorrection({ total: orders?.total, loading })
  const columns: AdminDataColumn<NonNullable<typeof data>['adminOrders']['items'][number]>[] = [
    {
      id: 'request',
      label: t('common:labelRequest'),
      enableHiding: false,
      cell: (order) => (
        <>
          #<bdi dir="ltr">{localized(order.id)}</bdi>
        </>
      ),
    },
    {
      id: 'date',
      label: t('common:labelDate'),
      cell: (order) => <>{localized(formatDateTime(serverDate(order.createdAt)))}</>,
    },
    {
      id: 'status',
      label: t('common:labelStatus'),
      cell: (order) => (
        <>
          <OrderStatusBadge status={order.status} paymentStatus={order.payment.status} />
          <PaymentStatus payment={order.payment} />
        </>
      ),
    },
    {
      id: 'customer',
      label: t('common:labelCustomer'),
      cell: (order) => (
        <>
          <bdi dir="auto">{localized(order.customerName)}</bdi>
          <p className="mt-1 text-xs text-muted-foreground">
            <bdi dir="ltr">{localized(order.email)}</bdi>
          </p>
        </>
      ),
    },
    {
      id: 'total',
      label: t('common:labelTotal'),
      numeric: true,
      cell: (order) => <>{localized(money(order.totalCents))}</>,
    },
    {
      id: 'details',
      label: t('common:labelDetails'),
      enableHiding: false,
      cell: (order) => (
        <>
          <IconAction asChild label={t('admin:viewRequestValue', { value0: order.id })} workspace>
            <Link to={order.id} state={{ returnTo: `/admin/orders?${params}` }}>
              <Eye aria-hidden="true" />
            </Link>
          </IconAction>
        </>
      ),
    },
  ]
  return (
    <section>
      <AdminPageHeader
        title={t('admin:allOrderRequests')}
        description={t('admin:savedDeliveryOrdersWithPaymentAndFulfillmentState')}
      />
      <AdminFilterToolbar
        search={search}
        searchLabel={t('admin:searchOrders')}
        searchPlaceholder={t('admin:orderNumberCustomerNameOrEmail')}
        onSearch={(value) => changeParams({ search: value, page: '' })}
      >
        <div className="admin-toolbar-field">
          <Label htmlFor="order-status-filter">{t('admin:status')}</Label>
          <Select
            value={status}
            onValueChange={(value) => changeParams({ status: value, page: '' })}
          >
            <SelectTrigger id="order-status-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t('admin:all')}</SelectItem>
              {Object.entries(orderStatusLabels).map(([key, label]) => (
                <SelectItem value={key} key={key}>
                  {localized(label)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </AdminFilterToolbar>
      <AdminFeedback loading={loading} error={localized(error)} retry={refetch} />
      <div hidden={loading || !!error || !orders}>
        <AdminDataTable
          columns={columns}
          items={orders?.items ?? []}
          rowKey={(order) => order.id}
          label={t('admin:orderRequests2')}
          emptyMessage={t('admin:noOrderRequestsOnThisPage')}
          page={page}
          total={orders?.total ?? 0}
          onPageChange={changePage}
          tableClassName="min-w-[640px]"
        />
      </div>
    </section>
  )
}
