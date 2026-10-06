// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeSwitch } from './ThemeSwitch'
import { TooltipProvider } from './ui/tooltip'
import { initializeTheme } from '../../lib/theme'

beforeEach(() => {
  localStorage.clear()
  initializeTheme()
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it('switches from the keyboard while preserving focus, form values and unrelated storage', async () => {
  localStorage.setItem('book-store-cart', '[{"id":"saved"}]')
  const user = userEvent.setup()
  renderWithTooltip(
    <>
      <ThemeSwitch />
      <input aria-label="Unsaved name" defaultValue="My draft" />
    </>,
  )
  const control = screen.getByRole('switch', { name: 'Dark mode' })
  expect(control.getAttribute('aria-checked')).toBe('true')
  expect(control.textContent).toBe('')
  expect(control.querySelector('svg[aria-hidden="true"]')).toBeTruthy()
  control.focus()
  await user.keyboard(' ')
  expect(control.getAttribute('aria-checked')).toBe('false')
  expect(control.textContent).toBe('')
  expect(document.activeElement).toBe(control)
  expect(localStorage.getItem('book-store-theme')).toBe('light')
  expect(localStorage.getItem('book-store-cart')).toBe('[{"id":"saved"}]')
  expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('My draft')
})

it('keeps switching usable when saving the preference is blocked', async () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('Blocked')
  })
  renderWithTooltip(<ThemeSwitch />)
  await userEvent.setup().click(screen.getByRole('switch', { name: 'Dark mode' }))
  expect(document.documentElement.dataset.theme).toBe('light')
  expect(screen.getByRole('switch').getAttribute('aria-checked')).toBe('false')
})

it('follows cross-tab preferences and resets invalid, removed or cleared preferences to Dark', () => {
  renderWithTooltip(<ThemeSwitch />)
  const control = screen.getByRole('switch')
  for (const [value, expected] of [
    ['light', 'false'],
    ['invalid', 'true'],
    ['light', 'false'],
    [null, 'true'],
  ] as const) {
    act(() =>
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'book-store-theme',
          newValue: value,
          storageArea: localStorage,
        }),
      ),
    )
    expect(control.getAttribute('aria-checked')).toBe(expected)
  }
  act(() =>
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: 'book-store-theme',
        newValue: 'light',
        storageArea: localStorage,
      }),
    ),
  )
  act(() =>
    window.dispatchEvent(new StorageEvent('storage', { key: null, storageArea: localStorage })),
  )
  expect(control.getAttribute('aria-checked')).toBe('true')
})

function renderWithTooltip(ui: Parameters<typeof render>[0]) {
  const result = render(<TooltipProvider>{ui}</TooltipProvider>)
  return {
    ...result,
    rerender: (next: typeof ui) => result.rerender(<TooltipProvider>{next}</TooltipProvider>),
  }
}

Object.defineProperty(globalThis, 'ResizeObserver', {
  configurable: true,
  value: class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
})
