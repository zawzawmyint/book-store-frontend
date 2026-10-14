// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { CatalogFilters } from './CatalogFilters'
import { parseCatalog } from '../catalog'

afterEach(cleanup)
vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
)
const state = () => parseCatalog(new URLSearchParams('search=reader&genre=Fiction&minPrice=100'))
it('keeps desktop filter controls mounted and focused when applied state changes', async () => {
  function Filters() {
    const [applied, setApplied] = useState(state())
    return (
      <CatalogFilters
        applied={applied}
        genres={['Fiction', 'Fantasy']}
        update={(values) => setApplied((current) => ({ ...current, ...values }))}
      />
    )
  }
  const user = userEvent.setup()
  render(<Filters />)
  const stock = screen.getByLabelText('In stock only')
  await user.click(stock)
  expect(screen.getByLabelText('In stock only')).toBe(stock)
  expect(document.activeElement).toBe(stock)
  const genre = screen.getByLabelText('Genre')
  await user.selectOptions(genre, 'Fantasy')
  expect(screen.getByLabelText('Genre')).toBe(genre)
  expect(document.activeElement).toBe(genre)
})
it('rejects invalid desktop ranges and synchronizes price drafts after navigation', async () => {
  const update = vi.fn(),
    user = userEvent.setup()
  const view = render(
    <CatalogFilters applied={state()} genres={['Fiction', 'Fantasy']} update={update} />,
  )
  await user.clear(screen.getByLabelText('Min price'))
  await user.type(screen.getByLabelText('Min price'), '1e2')
  await user.click(screen.getByRole('button', { name: 'Apply' }))
  expect(screen.getByRole('alert').textContent).toMatch(/decimal/)
  expect(update).not.toHaveBeenCalled()
  view.rerender(
    <CatalogFilters
      applied={{ ...state(), search: 'new' }}
      genres={['Fiction', 'Fantasy']}
      update={update}
    />,
  )
  expect(screen.getByLabelText('Min price')).toHaveProperty('value', '1.00')
})
it('discards dismissed drawer drafts, validates prices, and commits filters together', async () => {
  const update = vi.fn(),
    user = userEvent.setup()
  render(<CatalogFilters applied={state()} genres={['Fiction', 'Fantasy']} update={update} />)
  await user.click(screen.getByRole('button', { name: /^Filter & sort/ }))
  let dialog = within(screen.getByRole('dialog'))
  await user.selectOptions(dialog.getByLabelText('Sort by'), 'price-desc')
  await user.selectOptions(dialog.getByLabelText('Genre'), 'Fantasy')
  await user.click(dialog.getByLabelText('In stock only'))
  expect(update).not.toHaveBeenCalled()
  await user.keyboard('{Escape}')
  await user.click(screen.getByRole('button', { name: /^Filter & sort/ }))
  dialog = within(screen.getByRole('dialog'))
  expect(dialog.getByLabelText('Sort by')).toHaveProperty('value', 'default')
  expect(dialog.getByLabelText('Genre')).toHaveProperty('value', 'Fiction')
  expect(dialog.getByLabelText('In stock only')).toHaveProperty('checked', false)
  await user.selectOptions(dialog.getByLabelText('Genre'), 'Fantasy')
  await user.selectOptions(dialog.getByLabelText('Sort by'), 'title-asc')
  await user.click(dialog.getByLabelText('In stock only'))
  await user.type(dialog.getByLabelText('Max price'), '0.99')
  await user.click(dialog.getByRole('button', { name: 'Apply' }))
  expect(dialog.getByRole('alert').textContent).toMatch(/no greater/)
  expect(update).not.toHaveBeenCalled()
  await user.clear(dialog.getByLabelText('Max price'))
  await user.type(dialog.getByLabelText('Max price'), '12.50')
  await user.click(dialog.getByRole('button', { name: 'Apply' }))
  expect(update).toHaveBeenCalledWith({
    sort: 'title-asc',
    genre: 'Fantasy',
    inStock: true,
    minPrice: 100,
    maxPrice: 1250,
  })
  expect(screen.queryByRole('dialog')).toBeNull()
})
