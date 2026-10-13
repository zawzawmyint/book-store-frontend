// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { CartFeedback } from './CartFeedback'
import { useCartStore } from './cart-store'

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
  render(<CartFeedback workspace />)
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
  render(<CartFeedback workspace />)
  expect(
    screen.getByText('Book 1 could not be added because it is unavailable.').closest('.sr-only'),
  ).toBeNull()
})
