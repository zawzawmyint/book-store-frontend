import { localized, t, useI18n } from '../../lib/i18n'
import { orderStatusLabels } from './order-status'
import type { OrderStatus } from '../../generated/graphql'
import { Badge } from '../../app/components/ui/badge'
export function OrderStatusBadge({
  status,
  paymentStatus,
}: {
  status: OrderStatus
  paymentStatus?: string
}) {
  useI18n()

  return (
    <Badge variant={status === 'CANCELLED' ? 'destructive' : 'secondary'}>
      {localized(
        status === 'SUBMITTED' && paymentStatus
          ? paymentStatus === 'PAID'
            ? t('storefront:awaitingAcceptance')
            : t('storefront:awaitingPayment')
          : orderStatusLabels[status],
      )}
    </Badge>
  )
}
