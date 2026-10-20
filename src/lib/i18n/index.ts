import { createInstance } from 'i18next'
import { initReactI18next, useTranslation } from 'react-i18next'
import type common from './locales/en/common.json'
import type storefront from './locales/en/storefront.json'
import type admin from './locales/en/admin.json'
import { z } from 'zod'

export type Language = 'en' | 'ar' | 'th' | 'zh-Hans'
export type TranslationKey =
  | `common:${keyof typeof common}`
  | `storefront:${keyof typeof storefront}`
  | `admin:${keyof typeof admin}`
  | 'common:itemCount'
  | 'common:bookCount'
  | 'common:copyCount'
  | 'common:orderCount'
  | 'common:userCount'
  | 'storefront:booksFound'
type Values = Record<string, unknown>
const descriptors = new Map<string, { key: TranslationKey; values?: Values }>()
const descriptorTokens = new Map<string, string>()
const descriptorPrefix = `@i18n/${Array.from(crypto.getRandomValues(new Uint32Array(4)), (part) => part.toString(16)).join('-')}/`

export const languages: readonly { id: Language; name: string; locale: string }[] = [
  { id: 'en', name: 'English', locale: 'en-US' },
  { id: 'ar', name: 'العربية', locale: 'ar' },
  { id: 'th', name: 'ไทย', locale: 'th-TH' },
  { id: 'zh-Hans', name: '简体中文', locale: 'zh-CN' },
]
export function isLanguage(value: unknown): value is Language {
  return languages.some(({ id }) => id === value)
}

const resources: Record<string, Record<string, Record<string, string>>> = {}
const dictionaries = import.meta.glob<Record<string, string>>('./locales/*/*.json', {
  eager: true,
  import: 'default',
})
for (const [path, dictionary] of Object.entries(dictionaries)) {
  const [, languageId, namespace] = path.match(/locales\/([^/]+)\/([^/.]+)\.json$/)!
  ;(resources[languageId] ??= {})[namespace] = dictionary
}

export const i18n = createInstance()
void i18n.use(initReactI18next).init({
  resources,
  lng: 'en',
  supportedLngs: languages.map(({ id }) => id),
  fallbackLng: 'en',
  defaultNS: 'common',
  ns: ['common', 'storefront', 'admin'],
  initAsync: false,
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
})

export function language(): Language {
  return isLanguage(i18n.language) ? i18n.language : 'en'
}
export function locale(value: Language = language()): string {
  return languages.find(({ id }) => id === value)!.locale
}
export function direction(): 'ltr' | 'rtl' {
  return language() === 'ar' ? 'rtl' : 'ltr'
}
export function t(key: TranslationKey, values?: Values): string {
  const parameters = Object.fromEntries(
    Object.entries(values ?? {}).map(([name, value]) => [
      name,
      typeof value === 'string'
        ? localize(value)
        : typeof value === 'number' && name !== 'count'
          ? new Intl.NumberFormat(locale()).format(value)
          : value,
    ]),
  )
  if (typeof values?.count === 'number')
    parameters.formattedCount = new Intl.NumberFormat(locale()).format(values.count)
  return String(i18n.t(key, parameters))
}

/** Keep transient feedback and schema errors translatable after a language switch. */
export function message(key: TranslationKey, values?: Values): string {
  const signature = JSON.stringify({ key, values })
  const existing = descriptorTokens.get(signature)
  if (existing) return existing
  const token = descriptorPrefix + descriptors.size
  descriptors.set(token, { key, values })
  descriptorTokens.set(signature, token)
  return token
}

export function isMessage(value: unknown): value is string {
  return typeof value === 'string' && descriptors.has(value)
}

z.config({
  customError: (issue) => {
    if (issue.code === 'too_big' && issue.origin === 'string')
      return message('common:tooLong', { max: issue.maximum })
    if (issue.code === 'too_small' && issue.origin === 'string')
      return issue.minimum === 1
        ? message('common:fieldRequired')
        : message('common:tooShort', { min: issue.minimum })
    if (issue.code === 'invalid_format' && issue.format === 'email')
      return message('common:invalidEmail')
    return message('common:invalidValue')
  },
})
export function localize(value: string | undefined | null): string {
  if (!value) return ''
  const descriptor = descriptors.get(value)
  return descriptor ? t(descriptor.key, descriptor.values) : value
}

/** Only descriptors created by this module are translated; server content is preserved. */
export function localized(value: number | bigint): string
export function localized<T>(value: T): T
export function localized(value: unknown): unknown {
  return typeof value === 'string'
    ? localize(value)
    : typeof value === 'number' || typeof value === 'bigint'
      ? new Intl.NumberFormat(locale()).format(value)
      : value
}

function applyDocumentLanguage() {
  if (typeof document === 'undefined') return
  document.documentElement.lang = language()
  document.documentElement.dir = direction()
  document.title = t('common:documentTitle')
}
i18n.on('languageChanged', applyDocumentLanguage)

export function initializeLocalization(): void {
  let saved: string | null = null
  try {
    saved = localStorage.getItem('book-store-language')
  } catch {
    /* storage is optional */
  }
  void i18n.changeLanguage(isLanguage(saved) ? saved : 'en')
  applyDocumentLanguage()
}
export async function setLanguage(value: Language): Promise<void> {
  if (!isLanguage(value)) return
  await i18n.changeLanguage(value)
  try {
    localStorage.setItem('book-store-language', value)
  } catch {
    /* keep current in-memory choice */
  }
}

/** Subscribe each translated component without remounting its state or effects. */
export function useI18n() {
  useTranslation()
  return { t, language: language(), direction: direction() }
}
