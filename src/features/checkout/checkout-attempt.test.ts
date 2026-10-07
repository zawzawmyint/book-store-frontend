// @vitest-environment jsdom
import { beforeEach, expect, it } from 'vitest'
import {
  checkoutAttempt,
  confirmPaidAttempt,
  retireUnpaidAttempt,
  safeCheckoutUrl,
} from './checkout-attempt'

beforeEach(() => sessionStorage.clear())
it('reuses a key across refresh and scopes attempts to the customer', () => {
  const lines = [{ id: '1', quantity: 2 }]
  const first = checkoutAttempt('reader', lines)
  expect(checkoutAttempt('reader', lines).requestKey).toBe(first.requestKey)
  expect(checkoutAttempt('other', lines).requestKey).not.toBe(first.requestKey)
  expect(checkoutAttempt('reader', [{ id: '1', quantity: 3 }]).requestKey).not.toBe(
    first.requestKey,
  )
})
it('clears only the paid order snapshot with unchanged submitted lines', () => {
  const lines = [{ id: '1', quantity: 2 }]
  checkoutAttempt('reader', lines, '12')
  expect(confirmPaidAttempt('reader', 'other', lines)).toBe(false)
  expect(confirmPaidAttempt('reader', '12', [{ id: '1', quantity: 3 }])).toBe(false)
  expect(confirmPaidAttempt('reader', '12', lines)).toBe(false)
})
it('accepts only the hosted Stripe HTTPS origin', () => {
  expect(safeCheckoutUrl('https://checkout.stripe.com/c/pay/test')).toBe(true)
  for (const url of [
    'http://checkout.stripe.com/pay',
    'https://checkout.stripe.com.evil.com',
    'https://user@checkout.stripe.com/pay',
    'javascript:alert(1)',
  ])
    expect(safeCheckoutUrl(url)).toBe(false)
})

it('clears a matching snapshot once and validates corrupted records', () => {
  const lines = [{ id: '2', quantity: 1 }]
  checkoutAttempt('match', lines, '44')
  expect(confirmPaidAttempt('match', '44', lines)).toBe(true)
  expect(confirmPaidAttempt('match', '44', lines)).toBe(false)
  sessionStorage.setItem(
    'book-store-checkout:match',
    JSON.stringify({ userId: 'wrong', requestKey: crypto.randomUUID(), lines }),
  )
  expect(checkoutAttempt('match', lines).userId).toBe('match')
})
it('works in memory when session storage is unavailable', () => {
  const getter = Object.getOwnPropertyDescriptor(window, 'sessionStorage')!
  Object.defineProperty(window, 'sessionStorage', {
    configurable: true,
    get: () => {
      throw new Error('Denied')
    },
  })
  try {
    const first = checkoutAttempt('private', [{ id: '1', quantity: 1 }], '21')
    expect(checkoutAttempt('private', [{ id: '1', quantity: 1 }]).requestKey).toBe(first.requestKey)
    expect(confirmPaidAttempt('private', '21', [{ id: '1', quantity: 1 }])).toBe(true)
  } finally {
    Object.defineProperty(window, 'sessionStorage', getter)
  }
})

it('retires a definitive unpaid cancellation and preserves uncertain or paid attempts', () => {
  const lines = [{ id: '1', quantity: 1 }]
  const first = checkoutAttempt('terminal-reader', lines, '22').requestKey
  retireUnpaidAttempt('terminal-reader', {
    id: '22',
    status: 'SUBMITTED',
    payment: { status: 'PENDING' },
  })
  expect(checkoutAttempt('terminal-reader', lines).requestKey).toBe(first)
  retireUnpaidAttempt('terminal-reader', {
    id: '22',
    status: 'CANCELLED',
    payment: { status: 'PAID' },
  })
  expect(checkoutAttempt('terminal-reader', lines).requestKey).toBe(first)
  retireUnpaidAttempt('terminal-reader', {
    id: '22',
    status: 'CANCELLED',
    payment: { status: 'PENDING' },
  })
  expect(checkoutAttempt('terminal-reader', lines).requestKey).not.toBe(first)
})
