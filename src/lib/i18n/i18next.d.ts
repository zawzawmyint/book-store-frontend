import 'i18next'
import type common from './locales/en/common.json'
import type storefront from './locales/en/storefront.json'
import type admin from './locales/en/admin.json'

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common'
    enableSelector: false
    resources: { common: typeof common; storefront: typeof storefront; admin: typeof admin }
  }
}
