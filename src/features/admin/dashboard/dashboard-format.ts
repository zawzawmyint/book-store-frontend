import type { DashboardPeriod } from '../../../generated/graphql'
import { locale, type Language } from '../../../lib/i18n'

export function exactMoney(cents: string, language?: Language) {
  const value = BigInt(cents)
  const absolute = value < 0n ? -value : value
  const whole = absolute / 100n
  const signed = value < 0n ? (whole === 0n ? -0 : -whole) : whole
  const formatter = new Intl.NumberFormat(locale(language), { style: 'currency', currency: 'USD' })
  const fraction = new Intl.NumberFormat(locale(language), {
    useGrouping: false,
    minimumIntegerDigits: 2,
  }).format(absolute % 100n)
  return formatter
    .formatToParts(signed)
    .map((part) => (part.type === 'fraction' ? fraction : part.value))
    .join('')
}

export function plotAmount(cents: string) {
  const value = BigInt(cents)
  return value > BigInt(Number.MAX_SAFE_INTEGER) || value < BigInt(Number.MIN_SAFE_INTEGER)
    ? null
    : Number(value) / 100
}

export function dashboardPeriod(value: string | null): DashboardPeriod {
  return value === '7' ? 'DAYS_7' : value === '90' ? 'DAYS_90' : 'DAYS_30'
}

export function dashboardReturnTo(value: unknown): string | undefined {
  if (typeof value !== 'string' || !/^\/admin(?:\?|$)/.test(value)) return undefined
  const url = new URL(value, 'http://dashboard.local')
  return url.origin === 'http://dashboard.local' && url.pathname === '/admin'
    ? url.pathname + url.search
    : undefined
}
