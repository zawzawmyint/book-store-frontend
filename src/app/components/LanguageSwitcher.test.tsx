// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import { LanguageSwitcher } from './LanguageSwitcher'
import { setLanguage } from '../../lib/i18n'

afterEach(async () => {
  cleanup()
  await setLanguage('en')
  localStorage.clear()
})

it('labels the language control and reflects external selection without remounting', async () => {
  render(<LanguageSwitcher />)
  expect(screen.getByRole('combobox', { name: 'Language' })).toHaveTextContent('English')
  await act(() => setLanguage('zh-Hans'))
  expect(screen.getByRole('combobox')).toHaveTextContent('简体中文')
  expect(localStorage.getItem('book-store-language')).toBe('zh-Hans')
})
