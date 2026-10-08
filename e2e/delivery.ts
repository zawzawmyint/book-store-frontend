import { expect, type Page } from '@playwright/test'

export const deliveryAddress = {
  recipientName: 'Delivery Reader',
  phone: '+1 202 555 0123',
  addressLine1: '123 Reading Lane',
  addressLine2: null,
  city: 'Boston',
  region: null,
  postalCode: null,
  countryCode: 'US',
}

export async function fillDelivery(page: Page) {
  await page.getByLabel('Recipient name', { exact: true }).fill(deliveryAddress.recipientName)
  await page.getByLabel('Phone number', { exact: true }).fill(deliveryAddress.phone)
  await page.getByLabel('Address line 1', { exact: true }).fill(deliveryAddress.addressLine1)
  await page.getByLabel('City', { exact: true }).fill(deliveryAddress.city)
  await page.getByLabel('Country', { exact: true }).selectOption(deliveryAddress.countryCode)
}

export async function reviewDelivery(page: Page) {
  await fillDelivery(page)
  await page.getByRole('button', { name: 'Review order', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Continue to payment', exact: true })).toBeEnabled()
}

export async function checkoutInput(page: Page, items: { bookId: string; quantity: number }[]) {
  const result = await page.request.post('/graphql', {
    headers: { Origin: 'http://localhost:4173' },
    data: {
      query:
        'query ($input: QuoteCheckoutInput!) { quoteCheckout(input: $input) { deliveryFeeCents totalCents } }',
      variables: { input: { items, deliveryAddress } },
    },
  })
  const body = await result.json()
  expect(body.errors).toBeUndefined()
  return {
    requestKey: crypto.randomUUID(),
    items,
    deliveryAddress,
    expectedDeliveryFeeCents: body.data.quoteCheckout.deliveryFeeCents,
    expectedTotalCents: body.data.quoteCheckout.totalCents,
  }
}
