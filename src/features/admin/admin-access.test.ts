import { expect, it } from 'vitest'
import { accessErrorCode } from './admin-access'

it('chooses the first recognized access code and safely ignores malformed error shapes', () => {
  expect(
    accessErrorCode({
      errors: [
        null,
        { extensions: { code: 5 } },
        { extensions: { code: 'OTHER' } },
        { extensions: { code: 'FORBIDDEN' } },
        { extensions: { code: 'UNAUTHENTICATED' } },
      ],
    }),
  ).toBe('FORBIDDEN')
  expect(accessErrorCode({ errors: {} })).toBeUndefined()
  expect(accessErrorCode({ code: 'UNAUTHENTICATED' })).toBeUndefined()
})
