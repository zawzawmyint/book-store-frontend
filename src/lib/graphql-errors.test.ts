import { expect, it } from 'vitest'
import { CombinedGraphQLErrors } from '@apollo/client'
import { GraphQLError } from 'graphql'
import { firstGraphqlErrorCode, graphqlErrorCodes } from './graphql-errors'

it('reads ordered GraphQL codes without interpreting messages or transport errors', () => {
  const error = new CombinedGraphQLErrors({
    errors: [
      new GraphQLError('first', { extensions: { code: 'OTHER' } }),
      new GraphQLError('second', { extensions: { code: 'UNAUTHENTICATED' } }),
    ],
  })
  expect(graphqlErrorCodes(error)).toEqual(['OTHER', 'UNAUTHENTICATED'])
  expect(firstGraphqlErrorCode(error)).toBe('OTHER')
  expect(graphqlErrorCodes(new Error('UNAUTHENTICATED'))).toEqual([])
  expect(graphqlErrorCodes({ code: 'UNAUTHENTICATED' })).toEqual([])
})

it('ignores malformed entries while preserving the first issue position for cart recovery', () => {
  const error = {
    errors: [null, { extensions: { code: 4 } }, { extensions: { code: 'FORBIDDEN' } }],
  }
  expect(graphqlErrorCodes(error)).toEqual(['FORBIDDEN'])
  expect(firstGraphqlErrorCode(error)).toBeUndefined()
  for (const value of [null, undefined, 4, 'error', {}, { errors: {} }, { errors: 'wrong' }]) {
    expect(graphqlErrorCodes(value)).toEqual([])
    expect(firstGraphqlErrorCode(value)).toBeUndefined()
  }
})
