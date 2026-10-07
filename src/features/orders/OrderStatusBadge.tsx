import { orderStatusLabels } from './order-status'
import type { OrderStatus } from '../../generated/graphql'
import { Badge } from '../../app/components/ui/badge'
export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <Badge variant={status === 'CANCELLED' ? 'destructive' : 'secondary'}>
      {orderStatusLabels[status]}
    </Badge>
  )
}
