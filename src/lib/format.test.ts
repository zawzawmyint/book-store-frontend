import { afterEach, expect, it } from 'vitest'
import { formatDate, formatDateTime, formatNumber, money, serverDate } from './format'
import { setLanguage } from './i18n'
import { exactMoney } from '../features/admin/dashboard/dashboard-format'

afterEach(() => setLanguage('en'))

it.each(['en', 'ar', 'th', 'zh-Hans'] as const)(
  'uses selected %s formatting without changing USD or cents',
  async (language) => {
    await setLanguage(language)
    const locale = { en: 'en-US', ar: 'ar', th: 'th-TH', 'zh-Hans': 'zh-CN' }[language]
    expect(money(1234)).toBe(
      new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD' }).format(12.34),
    )
    expect(formatNumber(12345)).toBe(new Intl.NumberFormat(locale).format(12345))
    const instant = serverDate('2026-10-19 10:30:00')
    expect(instant.toISOString()).toBe('2026-10-19T10:30:00.000Z')
    expect(formatDate(instant)).toBe(
      new Intl.DateTimeFormat(locale, { calendar: 'gregory' }).format(instant),
    )
    expect(formatDateTime(instant)).toBe(instant.toLocaleString(locale, { calendar: 'gregory' }))
  },
)

it.each(['en', 'ar', 'th', 'zh-Hans'] as const)(
  'preserves exact signed dashboard cents in %s',
  async (language) => {
    await setLanguage(language)
    expect(exactMoney('9007199254740993123')).toBe(exactMoney('9007199254740993123', language))
    expect(exactMoney('-1')).not.toBe(exactMoney('1'))
    expect(exactMoney('9007199254740993123')).not.toBe(exactMoney('9007199254740993023'))
    expect(exactMoney('-0')).toBe(exactMoney('0'))
  },
)
