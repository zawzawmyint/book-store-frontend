// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { initializeLocalization, setLanguage, i18n, language } from './index'

afterEach(async () => {
  vi.restoreAllMocks()
  localStorage.clear()
  await setLanguage('en')
  localStorage.clear()
})

it('defaults to English and rejects malformed saved preferences', () => {
  localStorage.setItem('book-store-language', '"ar"')
  initializeLocalization()
  expect(language()).toBe('en')
  expect(document.documentElement.dir).toBe('ltr')
})

it.each(['en', 'ar', 'th', 'zh-Hans'] as const)(
  'restores %s and applies document direction',
  (saved) => {
    localStorage.setItem('book-store-language', saved)
    initializeLocalization()
    expect(language()).toBe(saved)
    expect(document.documentElement.lang).toBe(saved)
    expect(document.documentElement.dir).toBe(saved === 'ar' ? 'rtl' : 'ltr')
  },
)

it('switches in memory when preference storage is blocked and restores LTR', async () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('blocked')
  })
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('blocked')
  })
  initializeLocalization()
  await setLanguage('ar')
  expect(language()).toBe('ar')
  expect(document.documentElement.dir).toBe('rtl')
  await setLanguage('zh-Hans')
  expect(document.documentElement.dir).toBe('ltr')
})

it('falls back to English for a missing translated key', async () => {
  const isolated = i18n.cloneInstance({ forkResourceStore: true })
  isolated.addResource('en', 'common', 'language', 'English fallback')
  isolated.removeResourceBundle('th', 'common')
  await isolated.changeLanguage('th')
  expect(isolated.t('common:language')).toBe('English fallback')
})
