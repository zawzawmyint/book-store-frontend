import { message as msg, locale } from '../../lib/i18n'
import { z } from 'zod'
const controls = (value: string) =>
  Array.from(value).some(
    (c) => c.charCodeAt(0) < 32 || (c.charCodeAt(0) >= 127 && c.charCodeAt(0) <= 159),
  )
const required = (max: number) =>
  z
    .string()
    .refine((value) => !controls(value), msg('storefront:controlCharactersAreNotAllowed'))
    .transform((value) => value.trim())
    .pipe(z.string().min(1, msg('storefront:thisFieldIsRequired')).max(max))
const optional = (max: number) =>
  z
    .string()
    .nullable()
    .optional()
    .refine((value) => !value || !controls(value), msg('storefront:controlCharactersAreNotAllowed'))
    .transform((value) => value?.trim() || null)
    .refine(
      (value) => !value || value.length <= max,
      msg('storefront:useValueCharactersOrFewer', { value0: max }),
    )
export const deliveryAddressSchema = z.object({
  recipientName: required(120),
  phone: required(32).refine(
    (value) =>
      value.length >= 7 && /^[\d +()-]+$/.test(value) && value.replace(/\D/g, '').length >= 7,
    msg('storefront:enterAPhoneNumberWithAtLeastSevenDigits'),
  ),
  addressLine1: required(200),
  addressLine2: optional(200),
  city: required(100),
  region: optional(100),
  postalCode: optional(32),
  countryCode: required(2)
    .transform((value) => value.toUpperCase())
    .pipe(z.string().regex(/^[A-Z]{2}$/, msg('storefront:chooseACountry'))),
})
export type DeliveryAddress = z.output<typeof deliveryAddressSchema>
export type DeliveryAddressForm = z.input<typeof deliveryAddressSchema>
export function countryName(code: string) {
  return new Intl.DisplayNames([locale()], { type: 'region' }).of(code) ?? code
}
