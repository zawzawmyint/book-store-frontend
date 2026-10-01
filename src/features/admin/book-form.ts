import { z } from 'zod'

export function parsePriceCents(value: string): number {
  const text = value.trim()
  if (!/^\d+(\.\d{1,2})?$/.test(text))
    throw new Error('Enter a price with at most two decimal places')
  const [whole, fraction = ''] = text.split('.')
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
  if (!Number.isSafeInteger(cents) || cents > 1000000)
    throw new Error('Price must be between $0 and $10,000')
  return cents
}

export const bookFormSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  author: z.string().trim().min(1, 'Author is required').max(200),
  genre: z.string().trim().min(1, 'Genre is required').max(100),
  description: z.string().trim().min(1, 'Description is required').max(5000),
  price: z.string().refine((value) => {
    try {
      parsePriceCents(value)
      return true
    } catch {
      return false
    }
  }, 'Enter a price from $0 to $10,000 with at most two decimal places'),
})
export const initialStockSchema = z
  .string()
  .regex(/^\d+$/, 'Enter a whole number')
  .refine((value) => Number(value) <= 1000000, 'Stock must be at most 1,000,000')
export const stockDeltaSchema = z
  .string()
  .regex(/^-?\d+$/, 'Enter a signed whole number')
  .refine(
    (value) => Number(value) !== 0 && Math.abs(Number(value)) <= 1000000,
    'Change must be nonzero and within 1,000,000',
  )
export type BookFormValues = z.infer<typeof bookFormSchema>
