import { locale, type Language } from './i18n'

export const money = (cents: number, language?: Language) =>
  new Intl.NumberFormat(locale(language), { style: 'currency', currency: 'USD' }).format(
    cents / 100,
  )

export function formatNumber(
  value: number | bigint,
  options?: Intl.NumberFormatOptions,
  language?: Language,
) {
  return new Intl.NumberFormat(locale(language), options).format(value)
}

export function formatDate(value: string | Date, language?: Language) {
  return new Intl.DateTimeFormat(locale(language), { calendar: 'gregory' }).format(
    typeof value === 'string' ? serverDate(value) : value,
  )
}

export function formatDateTime(value: string | Date, language?: Language) {
  return (typeof value === 'string' ? serverDate(value) : value).toLocaleString(locale(language), {
    calendar: 'gregory',
  })
}

/** SQLite CURRENT_TIMESTAMP stores UTC without a timezone suffix. */
export function serverDate(value: string) {
  return new Date(
    /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(value)
      ? value.replace(' ', 'T') + 'Z'
      : value,
  )
}
