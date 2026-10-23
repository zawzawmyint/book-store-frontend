import { message as msg, t, localize } from '../../lib/i18n'
import { paymentLabels } from '../orders/payment-status'
import { orderStatusLabels } from '../orders/order-status'
import type { AdminActivityQueryVariables } from '../../generated/graphql'
import { money } from '../../lib/format'

export const activityActions = {
  ORDER_PAYMENT_CHANGED: msg('admin:paymentStatusChanged'),
  ORDER_STATUS_CHANGED: msg('admin:orderStatusChanged'),
  BOOK_CREATED: msg('admin:bookCreated'),
  BOOK_UPDATED: msg('admin:bookUpdated'),
  BOOK_STOCK_ADJUSTED: msg('admin:stockAdjusted'),
  BOOK_ARCHIVED: msg('admin:bookArchived'),
  BOOK_RESTORED: msg('admin:bookRestored'),
  USER_ROLE_CHANGED: msg('admin:userRoleChanged'),
  USER_PASSWORD_RESET: msg('admin:userPasswordReset'),
} as const
export const activityFields = {
  COVER: msg('admin:cover'),
  ORDER_PAYMENT_STATUS: msg('admin:paymentStatus'),
  ORDER_STATUS: msg('admin:orderStatus'),
  TITLE: msg('admin:title'),
  AUTHOR: msg('admin:author'),
  GENRE: msg('admin:genre'),
  DESCRIPTION: msg('admin:description'),
  PRICE_CENTS: msg('admin:price'),
  STOCK: msg('admin:stock'),
  ARCHIVED: msg('admin:archiveState'),
  ROLE: msg('admin:role'),
} as const
export function validActorId(id: string) {
  return (
    id.length <= 256 &&
    id.trim() === id &&
    id.length > 0 &&
    !/\s/.test(id) &&
    !hasControlCharacters(id)
  )
}
function hasControlCharacters(value: string) {
  return Array.from(value).some(
    (character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
  )
}
export function validBookId(id: string) {
  return /^[1-9]\d*$/.test(id) && Number.isSafeInteger(Number(id))
}
export function localDateBound(value: string, nextDay = false) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined
  const [year, month, day] = value.split('-').map(Number)
  if (year < 1000 || year > 9998) return undefined
  const date = new Date(year, month - 1, day)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day)
    return undefined
  if (nextDay) date.setDate(date.getDate() + 1)
  return date.toISOString()
}
export function readActivityFilters(params: URLSearchParams) {
  const actorUserId = params.get('actorUserId') ?? ''
  const from = params.get('from') ?? ''
  const to = params.get('to') ?? ''
  const actionValue = params.get('action') ?? ''
  const action = Object.hasOwn(activityActions, actionValue)
    ? (actionValue as keyof typeof activityActions)
    : undefined
  const variables: AdminActivityQueryVariables = {}
  let error = ''
  if (actorUserId) {
    if (!validActorId(actorUserId))
      error = msg('admin:enterAValidActorUserIdWithoutSpaces256CharactersOr')
    else variables.actorUserId = actorUserId
  }
  if (action) variables.action = action
  if (params.get('changedField') === 'PRICE_CENTS') variables.changedField = 'PRICE_CENTS'
  if (from) {
    const bound = localDateBound(from)
    if (!bound) error = msg('admin:enterAValidFromDate')
    else variables.from = bound
  }
  if (to) {
    const bound = localDateBound(to, true)
    if (!bound) error = msg('admin:enterAValidToDate')
    else variables.to = bound
  }
  if (from && to && from > to) error = msg('admin:fromDateMustBeOnOrBeforeToDate')
  return { variables, error, actorUserId, from, to, action: action ?? '' }
}
export function activityValue(field: string, value: string | null | undefined) {
  if (value == null) return t('admin:notPreviouslySet')
  if (
    field === 'PRICE_CENTS' &&
    /^(0|[1-9]\d*)$/.test(value) &&
    Number.isSafeInteger(Number(value))
  )
    return money(Number(value))
  if (field === 'ORDER_STATUS' && Object.hasOwn(orderStatusLabels, value))
    return localize(orderStatusLabels[value as keyof typeof orderStatusLabels])
  if (field === 'ORDER_PAYMENT_STATUS' && Object.hasOwn(paymentLabels, value))
    return localize(paymentLabels[value as keyof typeof paymentLabels])
  if (field === 'ROLE' && ['ADMIN', 'STAFF', 'CUSTOMER'].includes(value))
    return t(
      value === 'ADMIN'
        ? 'common:adminRole'
        : value === 'STAFF'
          ? 'common:staffRole'
          : 'common:customerRole',
    )
  if (field === 'ARCHIVED' && ['true', 'false'].includes(value))
    return value === 'true' ? t('admin:archived') : t('admin:active')
  return value || t('admin:empty')
}
export function adminListReturnTo(value: unknown, list: 'books' | 'users' | 'orders') {
  const fallback = `/admin/${list}`
  if (
    typeof value !== 'string' ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value.includes('\\') ||
    hasControlCharacters(value)
  )
    return fallback
  try {
    const url = new URL(value, 'https://internal.invalid')
    const allowed =
      url.pathname === fallback || (list === 'users' && url.pathname === '/admin/customers')
    return url.origin === 'https://internal.invalid' && allowed ? fallback + url.search : fallback
  } catch {
    return fallback
  }
}
export function booksReturnTo(value: unknown) {
  return adminListReturnTo(value, 'books')
}
