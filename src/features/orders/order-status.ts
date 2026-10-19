import { message as msg } from '../../lib/i18n'
export const orderStatusLabels = {
  SUBMITTED: msg('storefront:submitted'),
  PREPARING: msg('storefront:preparing'),
  SHIPPED: msg('storefront:shipped'),
  DELIVERED: msg('storefront:delivered'),
  CANCELLED: msg('storefront:cancelled'),
} as const
