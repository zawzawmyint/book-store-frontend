// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { AdminBreadcrumbs } from './AdminLayout'

afterEach(cleanup)

function Location() {
  const location = useLocation()
  return (
    <output>
      {location.pathname}
      {location.search}
    </output>
  )
}

it('exposes the current detail as non-interactive and navigates its existing parent', () => {
  render(
    <MemoryRouter initialEntries={['/admin/books/8/history?returnTo=%2Fadmin%2Fbooks%3Fpage%3D2']}>
      <AdminBreadcrumbs />
      <Location />
    </MemoryRouter>,
  )
  const parent = screen.getByRole('link', { name: 'Books' })
  expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeTruthy()
  expect(parent.getAttribute('href')).toBe('/admin/books')
  expect(screen.getByText('Book history').getAttribute('aria-current')).toBe('page')
  expect(screen.queryByRole('link', { name: 'Book history' })).toBeNull()
  fireEvent.click(parent)
  expect(screen.getByRole('status').textContent).toBe('/admin/books')
  expect(screen.getByText('Books').getAttribute('aria-current')).toBe('page')
})
