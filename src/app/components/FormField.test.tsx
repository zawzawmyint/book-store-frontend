// @vitest-environment jsdom
import { createRef } from 'react'
import '@testing-library/jest-dom/vitest'
import { afterEach, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FormField } from './FormField'
import { i18n, message } from '../../lib/i18n'

afterEach(async () => {
  cleanup()
  await i18n.changeLanguage('en')
})
it('preserves refs, external descriptions, registration and entered values through localized errors', async () => {
  const ref = createRef<HTMLInputElement>()
  const { rerender } = render(
    <>
      <p id="hint">Hint</p>
      <FormField
        id="name"
        name="name"
        label={message('storefront:fullName')}
        ref={ref}
        aria-describedby="hint"
        error={message('storefront:enterYourName')}
      />
    </>,
  )
  const input = screen.getByRole('textbox', { name: 'Full name' })
  expect(ref.current).toBe(input)
  expect(input).toHaveAttribute('name', 'name')
  expect(input).toHaveAttribute('aria-describedby', 'hint name-error')
  await userEvent.type(input, 'Reader')
  await i18n.changeLanguage('ar')
  expect(input).toHaveValue('Reader')
  expect(screen.getByRole('alert')).toHaveAttribute('id', 'name-error')
  rerender(
    <>
      <p id="hint">Hint</p>
      <FormField
        id="name"
        name="name"
        label={message('storefront:fullName')}
        ref={ref}
        aria-describedby="hint"
      />
    </>,
  )
  expect(input).toHaveAttribute('aria-describedby', 'hint')
  expect(input).toHaveValue('Reader')
})
