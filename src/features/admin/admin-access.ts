import { createContext, useContext, useEffect } from 'react'

export function accessErrorCode(error: unknown): string | undefined {
  if (error && typeof error === 'object' && 'errors' in error) {
    const entries = (error as { errors?: Array<{ extensions?: { code?: string } }> }).errors
    return entries?.find((entry) =>
      ['FORBIDDEN', 'UNAUTHENTICATED'].includes(entry.extensions?.code ?? ''),
    )?.extensions?.code
  }
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
