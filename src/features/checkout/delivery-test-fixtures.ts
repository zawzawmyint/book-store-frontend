export const testDeliveryAddress = {
  recipientName: 'Reader',
  phone: '1234567890',
  addressLine1: '12 Main St',
  addressLine2: null,
  city: 'NY',
  region: null,
  postalCode: null,
  countryCode: 'US',
}
export const testReviewedCheckout = {
  deliveryAddress: testDeliveryAddress,
  expectedDeliveryFeeCents: 500,
  expectedTotalCents: 1700,
}
export const testOrderDelivery = {
  subtotalCents: 1200,
  deliveryFeeCents: 500,
  delivery: { address: testDeliveryAddress, shipment: null, shippedAt: null, deliveredAt: null },
}
