import { expect, it } from 'vitest'
import { CombinedGraphQLErrors } from '@apollo/client'
import { GraphQLError } from 'graphql'
import { cartErrorCode } from './cart-error'

it('uses only the first combined issue, including an issue without a valid code', () => {
  const later = new GraphQLError('expired', { extensions: { code: 'UNAUTHENTICATED' } })
  for (const first of [
    new GraphQLError('missing'),
    new GraphQLError('invalid', { extensions: { code: 4 } }),
  ]) {
    expect(cartErrorCode(new CombinedGraphQLErrors({ errors: [first, later] }))).toBeUndefined()
  }
  expect(
    cartErrorCode(
      new CombinedGraphQLErrors({
        errors: [new GraphQLError('conflict', { extensions: { code: 'CART_CONFLICT' } }), later],
      }),
    ),
  ).toBe('CART_CONFLICT')
})

it('retains the plain-code fallback without interpreting messages or unbranded GraphQL arrays', () => {
  expect(cartErrorCode({ code: 'CART_CONFLICT' })).toBe('CART_CONFLICT')
  for (const error of [
    null,
    undefined,
    { code: 5 },
    new Error('UNAUTHENTICATED'),
    { errors: [{ extensions: { code: 'UNAUTHENTICATED' } }] },
  ]) {
    expect(cartErrorCode(error)).toBeUndefined()
  }
})
