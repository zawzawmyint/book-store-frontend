import { message as msg, t, useI18n } from '../../lib/i18n'
import { useEffect, useRef } from 'react'
import { CombinedGraphQLErrors } from '@apollo/client'
import { useApolloClient } from '@apollo/client/react'
import { useLocation } from 'react-router-dom'
import {
  MyCartDocument,
  SetCartItemDocument,
  MergeGuestCartDocument,
} from '../../generated/graphql'
import { authClient } from '../../lib/auth-client'
import { useCartStore } from './cart-store'
import { BookLoader } from '../../app/components/BookLoader'

/** SessionBoundary hides the full layout before this owner-scoped bridge mounts. */
export function CartSession({
  owner,
  children,
}: {
  owner: string | null
  children: React.ReactNode
}) {
  useI18n()

  const client = useApolloClient()
  const location = useLocation()
  const { refetch } = authClient.useSession()
  const refreshSession = useRef(refetch)
  useEffect(() => {
    refreshSession.current = refetch
  }, [refetch])
  const visibleOwner = useCartStore((state) => state.owner)
  useEffect(() => {
    let active = true
    const context = { headers: { 'X-Cart-Account': owner ?? '' }, queryDeduplication: false }
    async function request<T>(action: () => Promise<T>): Promise<T> {
      try {
        return await action()
      } catch (error) {
        if (
          active &&
          CombinedGraphQLErrors.is(error) &&
          error.errors.some((issue) => issue.extensions?.code === 'UNAUTHENTICATED')
        ) {
          void useCartStore.getState().identify(undefined)
          void refreshSession.current({ query: { disableCookieCache: true } })
        }
        throw error
      }
    }
    async function verified() {
      const session = await authClient.getSession({ query: { disableCookieCache: true } })
      if (
        !active ||
        !owner ||
        session.data?.user.id !== owner ||
        session.data?.user.emailVerified !== true
      ) {
        if (active) {
          void useCartStore.getState().identify(undefined)
          void refreshSession.current({ query: { disableCookieCache: true } })
        }
        throw new Error(msg('storefront:yourSessionChangedSignInAgainToLoadYourAccountBag'))
      }
    }
    void useCartStore.getState().identify(owner, {
      read: async () => {
        await verified()
        return request(async () => {
          const result = await client.query({
            query: MyCartDocument,
            fetchPolicy: 'no-cache',
            context,
          })
          if (!result.data?.myCart) throw new Error(msg('storefront:bagUnavailable'))
          return result.data.myCart
        })
      },
      set: async (input) => {
        await verified()
        return request(async () => {
          const result = await client.mutate({
            mutation: SetCartItemDocument,
            variables: { input },
            fetchPolicy: 'no-cache',
            context,
          })
          if (!result.data?.setCartItem) throw new Error(msg('storefront:saveUnavailable'))
          return result.data.setCartItem
        })
      },
      merge: async (input) => {
        await verified()
        return request(async () => {
          const result = await client.mutate({
            mutation: MergeGuestCartDocument,
            variables: { input },
            fetchPolicy: 'no-cache',
            context,
          })
          if (!result.data?.mergeGuestCart) throw new Error(msg('storefront:mergeUnavailable'))
          return result.data.mergeGuestCart
        })
      },
    })
    const onFocus = () => {
      if (active) void useCartStore.getState().refresh()
    }
    window.addEventListener('focus', onFocus)
    const onStorage = () => {
      if (active) {
        if (owner) void useCartStore.getState().refresh()
        else void useCartStore.getState().identify(null)
      }
    }
    window.addEventListener('storage', onStorage)
    return () => {
      active = false
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('storage', onStorage)
      void useCartStore.getState().identify(undefined)
    }
  }, [owner, client])
  useEffect(() => {
    if (location.pathname === '/cart') void useCartStore.getState().refresh()
  }, [location.pathname])
  return visibleOwner === owner ? (
    children
  ) : (
    <BookLoader label={t('storefront:loadingYourBag')} className="py-24" />
  )
}
