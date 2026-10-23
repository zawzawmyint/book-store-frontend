import { createContext, useContext, useEffect } from 'react'
import { graphqlErrorCodes } from '../../lib/graphql-errors'

export function accessErrorCode(error: unknown): string | undefined {
  return graphqlErrorCodes(error).find((code) => ['FORBIDDEN', 'UNAUTHENTICATED'].includes(code))
}
export const AccessContext = createContext({
  role: undefined as string | undefined,
  loading: true,
  error: undefined as Error | undefined,
  expired: false,
  retry: () => {},
  handleError: (_error: unknown) => {},
  confirmRole: async (_role: string) => {},
})
export const useAdminAccess = () => useContext(AccessContext)
export function useAdminQueryError(error: unknown) {
  const { handleError } = useAdminAccess()
  useEffect(() => {
    if (error) handleError(error)
  }, [error, handleError])
}

export function hasCapability(role: string | undefined, capability: 'PROCESS_ORDERS') {
  return capability === 'PROCESS_ORDERS' && (role === 'ADMIN' || role === 'STAFF')
}
