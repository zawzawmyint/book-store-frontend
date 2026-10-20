import { createContext, useContext } from 'react'
export type InboxScope = 'STOREFRONT' | 'WORKSPACE'
type Inbox = {
  scope: InboxScope
  enabled: boolean
  count: number | undefined
  error: boolean
  pending: boolean
  refresh: () => Promise<void>
  handleError: (error: unknown) => void
  register: (refresh: () => Promise<unknown>) => () => void
  markRead: (id?: string) => Promise<boolean>
}
export const NotificationContext = createContext<Inbox | undefined>(undefined)
export function useNotifications() {
  const value = useContext(NotificationContext)
  if (!value) throw new Error('NotificationProvider is required')
  return value
}
