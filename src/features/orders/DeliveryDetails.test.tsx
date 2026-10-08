// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { DeliveryDetails } from './DeliveryDetails'
import { safeTrackingUrl } from './tracking-url'
afterEach(cleanup)
it('rejects raw C1 controls in tracking URLs', () => {
  expect(safeTrackingUrl('https://carrier.example/track\u0085ABC')).toBe(false)
})
const delivery = {
  address: {
    recipientName: 'Ada',
    phone: '1234567890',
    addressLine1: '12 Main St',
    addressLine2: null,
    city: 'NY',
    region: null,
    postalCode: null,
    countryCode: 'US',
  },
  shipment: { carrier: 'Carrier', trackingNumber: 'ABC', trackingUrl: 'javascript:alert(1)' },
  shippedAt: null,
  deliveredAt: null,
}
it('shows saved destination and money but rejects unsafe tracking links', () => {
  render(
    <DeliveryDetails
      delivery={delivery}
      subtotalCents={1200}
      deliveryFeeCents={500}
      totalCents={1700}
      status="SHIPPED"
    />,
  )
  expect(screen.getByText('Ada')).toBeTruthy()
  expect(screen.getByText('$5.00')).toBeTruthy()
  expect(screen.queryByRole('link', { name: 'Track with carrier' })).toBeNull()
})
it('opens safe carrier pages without opener access and shows zero fee clearly', () => {
  render(
    <DeliveryDetails
      delivery={{
        ...delivery,
        shipment: { ...delivery.shipment, trackingUrl: 'https://carrier.example/ABC' },
      }}
      subtotalCents={1200}
      deliveryFeeCents={0}
      totalCents={1200}
      status="SHIPPED"
    />,
  )
  expect(screen.getByRole('link', { name: 'Track with carrier' }).getAttribute('rel')).toBe(
    'noopener noreferrer',
  )
  expect(screen.getByText('Free delivery')).toBeTruthy()
})
