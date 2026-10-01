// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { safeReturnTo } from './return-to'

describe('authentication return path', () => {
  it('keeps a local checkout path and query', () => {
    expect(safeReturnTo('/checkout?step=review')).toBe('/checkout?step=review')
  })

  it('rejects external, malformed, and auth-loop destinations', () => {
    for (const value of ['https://example.com', '//example.com', '/\\example.com', '/sign-in', null]) {
      expect(safeReturnTo(value)).toBe('/')
    }
  })
})
