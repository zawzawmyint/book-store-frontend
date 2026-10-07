import { orderStatusLabels } from '../orders/order-status'
import type { AdminActivityQueryVariables } from '../../generated/graphql'
import { money } from '../../lib/format'

export const activityActions = {
  ORDER_STATUS_CHANGED: 'Order status changed',
  BOOK_CREATED: 'Book created',
  BOOK_UPDATED: 'Book updated',
  BOOK_STOCK_ADJUSTED: 'Stock adjusted',
  BOOK_ARCHIVED: 'Book archived',
  BOOK_RESTORED: 'Book restored',
  USER_ROLE_CHANGED: 'User role changed',
  USER_PASSWORD_RESET: 'User password reset',
} as const
export const activityFields = {
  ORDER_STATUS: 'Order status',
  TITLE: 'Title',
  AUTHOR: 'Author',
  GENRE: 'Genre',
  DESCRIPTION: 'Description',
  PRICE_CENTS: 'Price',
  STOCK: 'Stock',
  ARCHIVED: 'Archive state',
  ROLE: 'Role',
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
      error = 'Enter a valid actor user ID without spaces (256 characters or fewer).'
    else variables.actorUserId = actorUserId
  }
  if (action) variables.action = action
  if (params.get('changedField') === 'PRICE_CENTS') variables.changedField = 'PRICE_CENTS'
  if (from) {
    const bound = localDateBound(from)
    if (!bound) error = 'Enter a valid From date.'
    else variables.from = bound
  }
  if (to) {
    const bound = localDateBound(to, true)
    if (!bound) error = 'Enter a valid To date.'
    else variables.to = bound
  }
  if (from && to && from > to) error = 'From date must be on or before To date.'
  return { variables, error, actorUserId, from, to, action: action ?? '' }
}
export function activityValue(field: string, value: string | null | undefined) {
  if (value == null) return 'Not previously set'
  if (
    field === 'PRICE_CENTS' &&
    /^(0|[1-9]\d*)$/.test(value) &&
    Number.isSafeInteger(Number(value))
  )
    return money(Number(value))
  if (field === 'ORDER_STATUS' && Object.hasOwn(orderStatusLabels, value))
    return orderStatusLabels[value as keyof typeof orderStatusLabels]
  if (field === 'ROLE' && ['ADMIN', 'STAFF', 'CUSTOMER'].includes(value))
    return value[0] + value.slice(1).toLowerCase()
  if (field === 'ARCHIVED' && ['true', 'false'].includes(value))
    return value === 'true' ? 'Archived' : 'Active'
  return value || '(empty)'
}
export function booksReturnTo(value: unknown) {
  if (typeof value !== 'string' || value.includes('\\') || hasControlCharacters(value))
    return '/admin/books'
  try {
    const url = new URL(value, 'https://internal.invalid')
    return url.origin === 'https://internal.invalid' &&
      url.pathname === '/admin/books' &&
      value.startsWith('/admin/books')
      ? url.pathname + url.search
      : '/admin/books'
  } catch {
    return '/admin/books'
  }
}
