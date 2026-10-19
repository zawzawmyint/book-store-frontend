import { afterEach, expect, it } from 'vitest'
import { i18n, setLanguage, t } from './index'

const resources = import.meta.glob<Record<string, string>>('./locales/*/*.json', {
  eager: true,
  import: 'default',
})
const categories = /_(zero|one|two|few|many|other)$/
const placeholders = (value: string) =>
  [...value.matchAll(/{{\s*(\w+)\s*}}/g)].map((match) => match[1]).sort()

afterEach(() => setLanguage('en'))

it.each(['common', 'storefront', 'admin'])(
  'ships complete %s dictionaries with matching placeholders and plural families',
  (namespace) => {
    const english = resources[`./locales/en/${namespace}.json`]
    const families = (dictionary: Record<string, string>) =>
      [...new Set(Object.keys(dictionary).map((key) => key.replace(categories, '')))].sort()
    for (const language of ['ar', 'th', 'zh-Hans']) {
      const dictionary = resources[`./locales/${language}/${namespace}.json`]
      expect(families(dictionary)).toEqual(families(english))
      for (const [key, value] of Object.entries(dictionary)) {
        expect(value.trim(), `${language}/${namespace}/${key}`).not.toBe('')
        const reference = english[key] ?? english[key.replace(categories, '_other')]
        expect(reference, `missing English family for ${key}`).toBeDefined()
        expect(placeholders(value), `${language}/${namespace}/${key}`).toEqual(
          placeholders(reference),
        )
      }
    }
  },
)

it('uses all six Arabic count forms rather than English singular/plural selection', async () => {
  await setLanguage('ar')
  const dictionary = resources['./locales/ar/common.json']
  for (const [count, suffix] of [
    [0, 'zero'],
    [1, 'one'],
    [2, 'two'],
    [3, 'few'],
    [11, 'many'],
    [100, 'other'],
  ] as const) {
    expect(t('common:itemCount', { count })).toBe(
      dictionary[`itemCount_${suffix}`].replace(
        '{{formattedCount}}',
        new Intl.NumberFormat('ar').format(count),
      ),
    )
  }
  expect(i18n.language).toBe('ar')
})
