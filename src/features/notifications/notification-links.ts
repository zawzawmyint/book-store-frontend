export function notificationLink(item: {
  scope: string
  resourceType: string
  resourceId: string
}): string | null {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(item.resourceId)) return null
  const id = encodeURIComponent(item.resourceId)
  if (item.resourceType === 'ORDER') {
    if (item.scope === 'STOREFRONT') return `/account/orders/${id}`
    if (item.scope === 'WORKSPACE') return `/admin/orders/${id}`
  }
  if (item.resourceType === 'BOOK' && item.scope === 'WORKSPACE') return `/admin/books/${id}/edit`
  return null
}
