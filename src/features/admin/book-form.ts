import { message as msg } from '../../lib/i18n'
import { z } from 'zod'

export function parsePriceCents(value: string): number {
  const text = value.trim()
  if (!/^\d+(\.\d{1,2})?$/.test(text))
    throw new Error(msg('admin:enterAPriceWithAtMostTwoDecimalPlaces'))
  const [whole, fraction = ''] = text.split('.')
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
  if (!Number.isSafeInteger(cents) || cents > 1000000)
    throw new Error(msg('admin:priceMustBeBetween0And10000'))
  return cents
}

export const bookFormSchema = z.object({
  title: z.string().trim().min(1, msg('admin:titleIsRequired')).max(200),
  author: z.string().trim().min(1, msg('admin:authorIsRequired')).max(200),
  genre: z.string().trim().min(1, msg('admin:genreIsRequired')).max(100),
  description: z.string().trim().min(1, msg('admin:descriptionIsRequired')).max(5000),
  price: z.string().refine((value) => {
    try {
      parsePriceCents(value)
      return true
    } catch {
      return false
    }
  }, msg('admin:enterAPriceFrom0To10000WithAtMost')),
})
export const initialStockSchema = z
  .string()
  .regex(/^\d+$/, msg('admin:enterAWholeNumber'))
  .refine((value) => Number(value) <= 1000000, msg('admin:stockMustBeAtMost1000000'))
export const stockDeltaSchema = z
  .string()
  .regex(/^-?\d+$/, msg('admin:enterASignedWholeNumber'))
  .refine(
    (value) => Number(value) !== 0 && Math.abs(Number(value)) <= 1000000,
    msg('admin:changeMustBeNonzeroAndWithin1000000'),
  )
export type BookFormValues = z.infer<typeof bookFormSchema>

/** History state survives reload; store a canonical kind rather than a session token. */
export function bookSaveNotice(value: unknown): string {
  if (!value || typeof value !== 'object' || !('kind' in value)) return ''
  return value.kind === 'book-created'
    ? msg('admin:bookCreated2')
    : value.kind === 'book-updated'
      ? msg('admin:bookUpdated2')
      : ''
}
