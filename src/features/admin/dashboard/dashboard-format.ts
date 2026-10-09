import type { DashboardPeriod } from '../../../generated/graphql'

export function exactMoney(cents: string) {
  const value = BigInt(cents)
  const absolute = value < 0n ? -value : value
  const dollars = (absolute / 100n).toLocaleString('en-US')
  return `${value < 0n ? '-' : ''}$${dollars}.${String(absolute % 100n).padStart(2, '0')}`
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
