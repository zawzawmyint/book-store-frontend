import type { NotificationFieldsFragment } from '../../generated/graphql'
import { t, type TranslationKey } from '../../lib/i18n'
const kinds = new Set([
  'PAYMENT_CONFIRMED',
  'ORDER_ACCEPTED',
  'ORDER_SHIPPED',
  'ORDER_DELIVERED',
  'ORDER_CANCELLED',
  'REFUND_COMPLETED',
  'NEW_PAID_ORDER',
  'STOCK_LOW',
  'STOCK_OUT',
  'REFUND_FAILED',
])
export function notificationMessage(item: NotificationFieldsFragment) {
  if (!kinds.has(item.kind)) return t('common:notificationGeneric')
  return t(`common:notification_${item.kind}` as TranslationKey, {
    id: item.resourceId,
    title: item.bookTitle ?? '',
    stock: item.stockAtEvent ?? 0,
  })
}
