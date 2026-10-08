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
  return (
    <Badge variant={status === 'CANCELLED' ? 'destructive' : 'secondary'}>
      {status === 'SUBMITTED' && paymentStatus
        ? paymentStatus === 'PAID'
          ? 'Awaiting acceptance'
          : 'Awaiting payment'
        : orderStatusLabels[status]}
    </Badge>
  )
}
