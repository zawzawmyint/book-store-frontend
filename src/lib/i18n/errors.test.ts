import { afterEach, expect, it } from 'vitest'
import { errorMessage } from './errors'
import { localize, setLanguage } from './index'

afterEach(() => setLanguage('en'))

it('maps stable codes without exposing server text and translates deferred feedback', async () => {
  const result = errorMessage(
    { errors: [{ extensions: { code: 'FORBIDDEN' } }], message: 'private internals' },
    'common:requestFailed',
  )
  expect(localize(result)).toBe('You do not have access to this action.')
  await setLanguage('zh-Hans')
  expect(localize(result)).toBe('您无权执行此操作。')
})

it('uses an operation-specific fallback for unknown errors regardless of their prose', () => {
  expect(
    localize(
      errorMessage(
        new Error('SQL query failed: private data'),
        'storefront:unableToUpdateYourName',
      ),
    ),
  ).toBe('Unable to update your name.')
})
