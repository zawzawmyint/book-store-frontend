// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { z } from 'zod'
import { FormField } from '../../app/components/FormField'
import { localize, message, setLanguage, t, useI18n } from './index'
import zh from './locales/zh-Hans/common.json'

afterEach(async () => {
  cleanup()
  await setLanguage('en')
})

it('translates a visible validation descriptor without replacing the input or its value', async () => {
  function Form() {
    useI18n()
    const [value, setValue] = useState('a draft')
    return (
      <FormField
        id="draft"
        label="Draft"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        error={message('common:tooLong', { max: 5 })}
      />
    )
  }
  render(<Form />)
  const input = screen.getByRole('textbox')
  await userEvent.setup().click(input)
  expect(screen.getByRole('alert').textContent).toBe('Use 5 characters or fewer.')
  await act(() => setLanguage('zh-Hans'))
  expect(screen.getByRole('textbox')).toBe(input)
  expect((input as HTMLInputElement).value).toBe('a draft')
  expect(document.activeElement).toBe(input)
  expect(screen.getByRole('alert').textContent).toBe(zh.tooLong.replace('{{max}}', '5'))
})

it('localizes default schema errors without changing the string limit', async () => {
  const schema = z.string().max(3)
  const result = schema.safeParse('four')
  expect(result.success).toBe(false)
  if (!result.success) {
    await setLanguage('zh-Hans')
    expect(localize(result.error.issues[0].message)).toBe(zh.tooLong.replace('{{max}}', '3'))
  }
  expect(schema.parse('abc')).toBe('abc')
})

it.each([
  'common:adminRole',
  'storefront:preparing',
  '@i18n:{broken}',
  '@i18n:{"key":"common:adminRole"}',
])(
  'preserves arbitrary stored content %s rather than interpreting it as a translation',
  (value) => {
    expect(localize(value)).toBe(value)
    expect(t('admin:bookIdentifier', { value0: value })).toBe(`book #${value}`)
  },
)
