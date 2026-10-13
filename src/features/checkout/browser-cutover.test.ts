// @vitest-environment jsdom
import { expect, it } from 'vitest'
import { initializeDeliveryBrowserData } from './browser-cutover'
it('retires pre-delivery attempts once while preserving saved bags for consent-based migration', () => {
  localStorage.clear()
  sessionStorage.clear()
  localStorage.setItem('book-store-cart', '[{"id":"1"}]')
  sessionStorage.setItem('book-store-checkout:old', '{}')
  initializeDeliveryBrowserData()
  expect(localStorage.getItem('book-store-cart')).toBe('[{"id":"1"}]')
  expect(sessionStorage.getItem('book-store-checkout:old')).toBeNull()
  localStorage.setItem('book-store-cart', '[{"id":"2"}]')
  initializeDeliveryBrowserData()
  expect(localStorage.getItem('book-store-cart')).toBe('[{"id":"2"}]')
})
