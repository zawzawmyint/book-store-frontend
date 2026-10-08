import { expect, it } from 'vitest'
import { deliveryAddressSchema } from './delivery-address'

const address = {
  recipientName: ' Ada ',
  phone: '+1 (212) 555-1234',
  addressLine1: ' 12 Main St ',
  addressLine2: '',
  city: ' New York ',
  region: '',
  postalCode: '',
  countryCode: 'us',
}
it('normalizes a delivery address while preserving its internal text', () => {
  expect(deliveryAddressSchema.parse(address)).toEqual({
    ...address,
    recipientName: 'Ada',
    addressLine1: '12 Main St',
    city: 'New York',
    countryCode: 'US',
    addressLine2: null,
    region: null,
    postalCode: null,
  })
})
it('rejects control characters, invalid phone numbers and oversized inputs', () => {
  for (const patch of [
    { city: 'New\nYork' },
    { phone: '123-456' },
    { phone: 'abc1234567' },
    { recipientName: 'a'.repeat(121) },
    { countryCode: 'USA' },
  ])
    expect(deliveryAddressSchema.safeParse({ ...address, ...patch }).success).toBe(false)
})

it('rejects C1 controls in required and optional address fields like the backend', () => {
  for (const patch of [{ city: 'New\u0085York' }, { addressLine2: 'Suite\u009fOne' }])
    expect(deliveryAddressSchema.safeParse({ ...address, ...patch }).success).toBe(false)
})
