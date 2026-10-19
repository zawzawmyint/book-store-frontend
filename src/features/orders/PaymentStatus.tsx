import { formatDateTime, serverDate } from '../../lib/format'
import { localized, t, useI18n } from '../../lib/i18n'
import { paymentLabels } from './payment-status'
type Payment = {
  status: keyof typeof paymentLabels
  currency: string
  expiresAt?: string | null
  paidAt?: string | null
  refundedAt?: string | null
}
export function PaymentStatus({ payment }: { payment: Payment }) {
  useI18n()

  return (
    <div className="space-y-1 text-sm">
      <p className="font-semibold">
        {localized(paymentLabels[payment.status])} ·{' '}
        <bdi dir="ltr">{payment.currency.toUpperCase()}</bdi>
      </p>
      {payment.paidAt && (
        <p>{t('storefront:paidValue', { value0: formatDateTime(serverDate(payment.paidAt)) })}</p>
      )}
      {payment.refundedAt && (
        <p>
          {t('storefront:refundedValue', {
            value0: formatDateTime(serverDate(payment.refundedAt)),
          })}
        </p>
      )}
      {payment.status === 'PENDING' && payment.expiresAt && (
        <p>
          {t('storefront:paymentWindowEndsValue', {
            value0: formatDateTime(serverDate(payment.expiresAt)),
          })}
        </p>
      )}
      {payment.status === 'REFUND_FAILED' && <p>{t('storefront:staffNeedsToResolveThisRefund')}</p>}
    </div>
  )
}
