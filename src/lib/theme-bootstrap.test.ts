// @vitest-environment jsdom
import html from '../../index.html?raw'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

beforeEach(() => {
  localStorage.clear()
  document.documentElement.className = ''
  delete document.documentElement.dataset.theme
})
afterEach(() => vi.restoreAllMocks())

it.each([null, 'invalid', 'light', 'dark'])(
  'applies saved %s appearance before loading React',
  (saved) => {
    if (saved !== null) localStorage.setItem('book-store-theme', saved)
    const script = html.match(/<script id="theme-bootstrap">([\s\S]*?)<\/script>/)?.[1]
    expect(script, 'prepaint bootstrap must run in the head').toBeTruthy()
    window.eval(script!)
    const expected = saved === 'light' ? 'light' : 'dark'
    expect(document.documentElement.dataset.theme).toBe(expected)
    expect(document.documentElement.classList.contains('dark')).toBe(expected === 'dark')
    expect(document.documentElement.style.colorScheme).toBe(expected)
  },
)

it('starts in Dark when preference storage is blocked', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('Blocked')
  })
  const script = html.match(/<script id="theme-bootstrap">([\s\S]*?)<\/script>/)?.[1]
  expect(script).toBeTruthy()
  expect(() => window.eval(script!)).not.toThrow()
  expect(document.documentElement.dataset.theme).toBe('dark')
})
