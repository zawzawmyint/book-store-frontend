import { localized, t, useI18n } from '../lib/i18n'
import { clearCheckoutAttempts } from '../features/checkout/checkout-attempt'
import { useEffect, useState } from 'react'
import { useApolloClient } from '@apollo/client/react'
import { authClient } from '../lib/auth-client'
import { CartSession } from '../features/cart/CartSession'
import { BookLoader } from './components/BookLoader'
import { useCartStore } from '../features/cart/cart-store'

/** Unmounts routed content until Apollo data is cleared for the current identity. */
export function SessionBoundary({ children }: { children: React.ReactNode }) {
  useI18n()

  const { data, isPending } = authClient.useSession()
  const client = useApolloClient()
  const userId = data?.user.emailVerified === true ? data.user.id : null
  const [readyId, setReadyId] = useState<string | null | undefined>(undefined)

  useEffect(() => {
    if (isPending || readyId !== userId) void useCartStore.getState().identify(undefined)
  }, [isPending, readyId, userId])

  useEffect(() => {
    if (isPending || readyId === userId) return
    let active = true
    if (readyId !== undefined && readyId !== userId) clearCheckoutAttempts()
    void client.clearStore().then(() => {
      if (active) setReadyId(userId)
    })
    return () => {
      active = false
    }
  }, [client, isPending, readyId, userId])

  if (isPending || readyId !== userId) {
    return <BookLoader label={t('common:loadingYourAccount')} className="py-24" />
  }
  return <CartSession owner={userId}>{localized(children)}</CartSession>
}
