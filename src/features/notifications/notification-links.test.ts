import { expect, it } from 'vitest'
import { notificationLink } from './notification-links'

it('constructs local links only for matching resource and inbox scopes', () => {
  expect(notificationLink({ scope: 'STOREFRONT', resourceType: 'ORDER', resourceId: '123' })).toBe(
    '/account/orders/123',
  )
  expect(notificationLink({ scope: 'WORKSPACE', resourceType: 'BOOK', resourceId: '12' })).toBe(
    '/admin/books/12/edit',
  )
  expect(
    notificationLink({ scope: 'STOREFRONT', resourceType: 'BOOK', resourceId: '12' }),
  ).toBeNull()
  for (const resourceId of ['../users', '//evil.test', '', '%2fadmin', 'x?admin=true'])
    expect(notificationLink({ scope: 'WORKSPACE', resourceType: 'ORDER', resourceId })).toBeNull()
})
