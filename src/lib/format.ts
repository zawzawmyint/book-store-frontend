export const money = (cents: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)

/** SQLite CURRENT_TIMESTAMP stores UTC without a timezone suffix. */
export function serverDate(value: string) {
  return new Date(
    /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(value)
      ? value.replace(' ', 'T') + 'Z'
      : value,
  )
}
