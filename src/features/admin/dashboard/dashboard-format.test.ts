import { expect, it } from 'vitest'
import { exactMoney, plotAmount, dashboardPeriod, dashboardReturnTo } from './dashboard-format'

it('formats exact signed cents beyond JavaScript safe integers', () => {
  expect(exactMoney('4000000000')).toBe('$40,000,000.00')
  expect(exactMoney('-2000000000')).toBe('-$20,000,000.00')
  expect(exactMoney('900719925474099312')).toBe('$9,007,199,254,740,993.12')
  expect(plotAmount('900719925474099312')).toBeNull()
  expect(plotAmount('101')).toBe(1.01)
})
it('normalizes periods and rejects unsafe dashboard return destinations', () => {
  expect(dashboardPeriod('7')).toBe('DAYS_7')
  expect(dashboardPeriod('90')).toBe('DAYS_90')
  expect(dashboardPeriod('invalid')).toBe('DAYS_30')
  expect(dashboardReturnTo('/admin?period=7')).toBe('/admin?period=7')
  expect(dashboardReturnTo('//evil.example/admin')).toBeUndefined()
  expect(dashboardReturnTo('/admin-other')).toBeUndefined()
})
