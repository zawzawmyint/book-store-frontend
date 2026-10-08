// @vitest-environment jsdom
import { beforeEach, expect, it, vi } from 'vitest'
import {
  checkoutAttempt,
  confirmPaidAttempt,
  retireUnpaidAttempt,
  safeCheckoutUrl,
} from './checkout-attempt'

const reviewed = {
  deliveryAddress: {
    recipientName: 'Ada',
    phone: '1234567890',
    addressLine1: '12 Main St',
    addressLine2: null,
    city: 'NY',
    region: null,
    postalCode: null,
    countryCode: 'US',
  },
  expectedDeliveryFeeCents: 500,
  expectedTotalCents: 1700,
}
beforeEach(() => sessionStorage.clear())
it('reuses a key across refresh and scopes attempts to the customer', () => {
  const lines = [{ id: '1', quantity: 2 }]
  const first = checkoutAttempt('reader', lines, reviewed)
  expect(checkoutAttempt('reader', lines, reviewed).requestKey).toBe(first.requestKey)
  expect(checkoutAttempt('other', lines, reviewed).requestKey).not.toBe(first.requestKey)
  expect(checkoutAttempt('reader', [{ id: '1', quantity: 3 }], reviewed).requestKey).not.toBe(
    first.requestKey,
  )
})
it('clears only the paid order snapshot with unchanged submitted lines', () => {
  const lines = [{ id: '1', quantity: 2 }]
  checkoutAttempt('reader', lines, reviewed, '12')
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
  checkoutAttempt('match', lines, reviewed, '44')
  expect(confirmPaidAttempt('match', '44', lines)).toBe(true)
  expect(confirmPaidAttempt('match', '44', lines)).toBe(false)
  sessionStorage.setItem(
    'book-store-checkout:match',
    JSON.stringify({ userId: 'wrong', requestKey: crypto.randomUUID(), lines }),
  )
  expect(checkoutAttempt('match', lines, reviewed).userId).toBe('match')
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
    const first = checkoutAttempt('private', [{ id: '1', quantity: 1 }], reviewed, '21')
    expect(checkoutAttempt('private', [{ id: '1', quantity: 1 }], reviewed).requestKey).toBe(
      first.requestKey,
    )
    expect(confirmPaidAttempt('private', '21', [{ id: '1', quantity: 1 }])).toBe(true)
  } finally {
    Object.defineProperty(window, 'sessionStorage', getter)
  }
})

it('retires a definitive unpaid cancellation and preserves uncertain or paid attempts', () => {
  const lines = [{ id: '1', quantity: 1 }]
  const first = checkoutAttempt('terminal-reader', lines, reviewed, '22').requestKey
  retireUnpaidAttempt('terminal-reader', {
    id: '22',
    status: 'SUBMITTED',
    payment: { status: 'PENDING' },
  })
  expect(checkoutAttempt('terminal-reader', lines, reviewed).requestKey).toBe(first)
  retireUnpaidAttempt('terminal-reader', {
    id: '22',
    status: 'CANCELLED',
    payment: { status: 'PAID' },
  })
  expect(checkoutAttempt('terminal-reader', lines, reviewed).requestKey).toBe(first)
  retireUnpaidAttempt('terminal-reader', {
    id: '22',
    status: 'CANCELLED',
    payment: { status: 'PENDING' },
  })
  expect(checkoutAttempt('terminal-reader', lines, reviewed).requestKey).not.toBe(first)
})

it('changes the key for a different destination or reviewed amount', () => {
  const lines = [{ id: '1', quantity: 1 }]
  const first = checkoutAttempt('drift', lines, reviewed)
  expect(
    checkoutAttempt('drift', lines, { ...reviewed, expectedTotalCents: 1800 }).requestKey,
  ).not.toBe(first.requestKey)
  const second = checkoutAttempt('drift', lines, reviewed)
  expect(
    checkoutAttempt('drift', lines, {
      ...reviewed,
      deliveryAddress: { ...reviewed.deliveryAddress, city: 'Boston' },
    }).requestKey,
  ).not.toBe(second.requestKey)
})

it('preserves its in-memory key when storage reads work but writes fail', () => {
  const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('Quota')
  })
  try {
    const lines = [{ id: '1', quantity: 1 }]
    const first = checkoutAttempt('quota-reader', lines, reviewed)
    expect(checkoutAttempt('quota-reader', lines, reviewed).requestKey).toBe(first.requestKey)
  } finally {
    write.mockRestore()
  }
})
