import { serverDate } from '../../lib/format'
import { paymentLabels } from './payment-status'
type Payment = {
  status: keyof typeof paymentLabels
  currency: string
  expiresAt?: string | null
  paidAt?: string | null
  refundedAt?: string | null
}
export function PaymentStatus({ payment }: { payment: Payment }) {
  return (
    <div className="space-y-1 text-sm">
      <p className="font-semibold">
        {paymentLabels[payment.status]} · {payment.currency.toUpperCase()}
      </p>
      {payment.paidAt && <p>Paid {serverDate(payment.paidAt).toLocaleString()}</p>}
      {payment.refundedAt && <p>Refunded {serverDate(payment.refundedAt).toLocaleString()}</p>}
      {payment.status === 'PENDING' && payment.expiresAt && (
        <p>Payment window ends {serverDate(payment.expiresAt).toLocaleString()}</p>
      )}
      {payment.status === 'REFUND_FAILED' && <p>Staff needs to resolve this refund.</p>}
    </div>
  )
}
