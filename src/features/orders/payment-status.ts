import { message as msg } from '../../lib/i18n'
export const paymentLabels = {
  PENDING: msg('storefront:paymentPending'),
  PAID: msg('storefront:paid'),
  EXPIRED: msg('storefront:paymentExpired'),
  REFUND_PENDING: msg('storefront:refundPending'),
  REFUNDED: msg('storefront:refunded'),
  REFUND_FAILED: msg('storefront:refundFailed'),
} as const
