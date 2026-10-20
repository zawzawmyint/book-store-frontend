import { expect, it } from 'vitest'
import {
  getAdminNavigation,
  getAdminBreadcrumbs,
  getAdminSectionLabel,
  isAdminNavigationActive,
} from './admin-navigation'

it('builds existing parent links and non-interactive current pages for known details', () => {
  expect(getAdminBreadcrumbs('/admin/books/2/edit')).toEqual([
    { label: 'Books', to: '/admin/books' },
    { label: 'Edit book' },
  ])
  expect(getAdminBreadcrumbs('/admin/books/2/history')).toEqual([
    { label: 'Books', to: '/admin/books' },
    { label: 'Book history' },
  ])
  expect(getAdminBreadcrumbs('/admin/orders/8')).toEqual([
    { label: 'Orders', to: '/admin/orders' },
    { label: 'Order #8' },
  ])
  expect(getAdminBreadcrumbs('/admin/books/new')).toEqual([
    { label: 'Books', to: '/admin/books' },
    { label: 'Add book' },
  ])
})

it('does not infer breadcrumbs from unknown suffixes or prefix collisions', () => {
  expect(getAdminBreadcrumbs('/admin/orders-other')).toEqual([])
  expect(getAdminBreadcrumbs('/admin/books/2/unknown')).toEqual([])
  expect(getAdminBreadcrumbs('/admin/profile')).toEqual([{ label: 'Profile' }])
})

it('keeps the Orders header distinct from its Sales sidebar group on detail routes', () => {
  expect(getAdminSectionLabel('/admin/orders/2')).toBe('Orders')
  expect(getAdminNavigation('STAFF').find(({ to }) => to === '/admin/orders')?.group).toBe('Sales')
  expect(isAdminNavigationActive('/admin/orders/2', '/admin/orders')).toBe(true)
  expect(isAdminNavigationActive('/admin/orders-other', '/admin/orders')).toBe(false)
})

it('keeps Profile as a header section without adding a sidebar link', () => {
  expect(getAdminSectionLabel('/admin/profile')).toBe('Profile')
  expect(getAdminNavigation('ADMIN').some(({ to }) => to === '/admin/profile')).toBe(false)
})

it('shows Users and Activity only to Admin and retains the public workspace link order', () => {
  expect(getAdminNavigation('STAFF').map(({ to }) => to)).toEqual([
    '/admin',
    '/admin/books',
    '/admin/orders',
  ])
  expect(getAdminNavigation('ADMIN').map(({ to }) => to)).toEqual([
    '/admin',
    '/admin/books',
    '/admin/orders',
    '/admin/users',
    '/admin/activity',
  ])
})

it('matches the dashboard exactly and preserves the Catalog fallback', () => {
  expect(getAdminSectionLabel('/admin')).toBe('Overview')
  expect(getAdminSectionLabel('/admin/')).toBe('Catalog')
  expect(getAdminSectionLabel('/admin/unknown')).toBe('Catalog')
  expect(isAdminNavigationActive('/admin/books/2/edit', '/admin')).toBe(false)
})
