import { CombinedGraphQLErrors } from '@apollo/client'
import { firstGraphqlErrorCode } from '../../lib/graphql-errors'

export const cartErrorCode = (error: unknown) =>
  CombinedGraphQLErrors.is(error)
    ? firstGraphqlErrorCode(error)
    : typeof (error as { code?: unknown } | null)?.code === 'string'
      ? (error as { code: string }).code
      : undefined
