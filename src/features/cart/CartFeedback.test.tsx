// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { act, cleanup, render, screen } from '@testing-library/react'
import { CartFeedback } from './CartFeedback'
import { useCartStore } from './cart-store'

beforeEach(() => {
  useCartStore.setState({
    owner: 'customer',
    status: 'ready',
    message: '',
    notices: [],
    legacyItems: [],
    legacyUnreadable: false,
    storageWarning: '',
    validationMessage: '',
  })
})

it.each([
  ['ready', 'Your bag is up to date.', 'Your bag is up to date.'],
  ['ready', 'Bag saved.', 'Bag saved.'],
  ['loading', '', 'Loading your bag…'],
  ['saving', '', 'Saving your bag…'],
] as const)(
  'keeps routine %s feedback out of storefront layout',
  (status, message, announcement) => {
    useCartStore.setState({ status, message })
    const { container } = render(<CartFeedback />)
    const element = screen.getByRole('status')
    expect(element.textContent).toBe(announcement)
    expect(element.classList.contains('sr-only')).toBe(true)
    expect(container.querySelector('.py-4')).toBeNull()
  },
)

it('keeps the unconfirmed-edit recovery warning visible', () => {
  useCartStore.setState({
    message: 'Your bag was reloaded. An unconfirmed edit may not have been saved.',
  })
  render(<CartFeedback />)
  expect(screen.getByRole('status').closest('.sr-only')).toBeNull()
})

it('discloses legacy items without importing or discarding them', async () => {
  const importLegacy = vi.fn()
  const discardLegacy = vi.fn()
  const original = useCartStore.getState()
  useCartStore.setState({
    legacyItems: [
      {
        id: '1',
        title: 'Old book',
        author: 'Author',
        genre: 'Fiction',
        priceCents: 1000,
        quantity: 2,
        stock: 10,
      },
    ],
    importLegacy,
    discardLegacy,
  })
  render(<CartFeedback />)
  expect(screen.getByText(/may belong to someone else/)).toBeTruthy()
  const disclosure = screen.getByText('View saved books')
  await userEvent.click(disclosure)
  expect(screen.getByText('2 × Old book')).toBeTruthy()
  expect(importLegacy).not.toHaveBeenCalled()
  expect(discardLegacy).not.toHaveBeenCalled()
  await userEvent.click(screen.getByRole('button', { name: 'Add saved bag to my account' }))
  expect(importLegacy).toHaveBeenCalledTimes(1)
  useCartStore.setState({
    importLegacy: original.importLegacy,
    discardLegacy: original.discardLegacy,
  })
})

it('keeps merge progress and failed-save retry controls visible', () => {
  useCartStore.setState({ status: 'merging' })
  const view = render(<CartFeedback />)
  expect(screen.getByText('Merging your guest bag…').closest('.sr-only')).toBeNull()
  act(() =>
    useCartStore.setState({
      status: 'error',
      message: 'Bag save could not be confirmed.',
      retryKind: 'save',
    }),
  )
  view.rerender(<CartFeedback />)
  expect(screen.getByRole('alert').textContent).toContain('Bag save could not be confirmed.')
  expect(screen.getByRole('button', { name: 'Retry save' })).toBeTruthy()
})

afterEach(() => {
  cleanup()
  void useCartStore.getState().identify(null)
})
it('announces a passive workspace refresh without inserting visible layout content', () => {
  useCartStore.setState({
    owner: 'staff',
    status: 'ready',
    message: 'Your bag is up to date.',
    notices: [],
    legacyItems: [],
    legacyUnreadable: false,
    storageWarning: '',
    validationMessage: '',
  })
  render(<CartFeedback />)
  expect(screen.getByRole('status').classList.contains('sr-only')).toBe(true)
  expect(screen.getByRole('status').textContent).toBe('Your bag is up to date.')
})
it('keeps adjusted guest merge notices visible in the workspace', () => {
  useCartStore.setState({
    owner: 'staff',
    status: 'ready',
    message: 'Bag saved.',
    notices: [{ bookId: '1', reason: 'UNAVAILABLE' }],
    legacyItems: [],
    legacyUnreadable: false,
    storageWarning: '',
    validationMessage: '',
  })
  render(<CartFeedback />)
  expect(
    screen.getByText('Book 1 could not be added because it is unavailable.').closest('.sr-only'),
  ).toBeNull()
})
