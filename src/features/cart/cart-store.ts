import { message as msg } from '../../lib/i18n'
import { create } from 'zustand'
import { cartErrorCode } from './cart-error'
import { runCartOperation } from './cart-account'
import { createGuestCart } from './cart-guest'
import { addToCart, changeQuantity, type BookSummary, type CartItem } from './cart'
import {
  cartPersistence,
  withCartStorageLock,
  acknowledgeCartEdit,
  type PendingMerge,
} from './cart-persistence'
export type ServerCart = {
  revision: string
  items: (Omit<CartItem, 'id'> & { bookId: string; lineVersion: string; available: boolean })[]
  mergeNotices: { bookId: string; reason: string }[]
}
export type SetCartInput = {
  bookId: string
  quantity: number
  expectedRevision: string
  requestKey: string
}
export type MergeCartInput = Pick<PendingMerge, 'items' | 'expectedRevision' | 'requestKey'>
export type CartTransport = {
  read: () => Promise<ServerCart>
  set: (input: SetCartInput) => Promise<ServerCart>
  merge: (input: MergeCartInput) => Promise<ServerCart>
}
export type CartOperation =
  { kind: 'set'; input: SetCartInput } | { kind: 'merge'; record: PendingMerge }
export type CartState = {
  items: CartItem[]
  owner: string | null | undefined
  revision?: string
  status: 'guest' | 'loading' | 'ready' | 'saving' | 'merging' | 'error' | 'conflict'
  message: string
  validationMessage: string
  notices: ServerCart['mergeNotices']
  storageWarning: string
  legacyItems: CartItem[]
  legacyUnreadable: boolean
  retryKind: 'save' | 'merge' | 'load'
  add: (book: BookSummary, quantity?: number) => Promise<boolean>
  update: (id: string, quantity: number) => void
  clear: () => void
  identify: (owner: string | null | undefined, api?: CartTransport) => Promise<void>
  refresh: () => Promise<void>
  retry: () => Promise<void>
  importLegacy: () => Promise<void>
  discardLegacy: () => void
}
export const cartBlocked = (state: Pick<CartState, 'status'>) =>
  !['ready', 'guest'].includes(state.status)
export const checkoutCartReady = (state: CartState) =>
  state.owner != null &&
  state.status === 'ready' &&
  state.items.length > 0 &&
  state.items.every((item) => item.available !== false && item.stock >= item.quantity)
export function createCartStore() {
  const disk = cartPersistence()
  let api: CartTransport | undefined
  let generation = 0
  let accepted = 0
  let readSequence = 0
  let operation: CartOperation | undefined
  const store = create<CartState>()((set, get) => {
    const warning = () => set({ storageWarning: disk.warning() })
    const apply = (cart: ServerCart, passive = false) => {
      accepted++
      set({
        revision: cart.revision,
        items: cart.items.map(({ bookId, ...line }) => ({ id: bookId, ...line })),
        notices: passive ? get().notices : cart.mergeNotices,
      })
    }
    const active = (owner: string, token: number) => generation === token && get().owner === owner
    const guest = createGuestCart(disk, { set, get, generation: () => generation, warning })
    const { synchronize, persist: persistGuest, edit: editGuest } = guest
    async function read(initial = false) {
      const owner = get().owner
      if (!owner || !api || (!initial && cartBlocked(get()))) return
      const token = generation,
        epoch = accepted,
        sequence = ++readSequence
      try {
        const cart = await api.read()
        if (
          !active(owner, token) ||
          epoch !== accepted ||
          sequence !== readSequence ||
          (!initial && cartBlocked(get()))
        )
          return
        apply(cart, true)
        set({
          status: 'ready',
          message: initial
            ? acknowledgeCartEdit(owner)
              ? msg('storefront:yourBagWasReloadedAnUnconfirmedEditMayNotHaveBeen')
              : ''
            : msg('storefront:yourBagIsUpToDate'),
        })
      } catch (error) {
        if (
          !active(owner, token) ||
          epoch !== accepted ||
          sequence !== readSequence ||
          (!initial && cartBlocked(get()))
        )
          return
        if (cartErrorCode(error) === 'UNAUTHENTICATED') {
          await get().identify(undefined)
          return
        }
        set({
          status: 'error',
          retryKind: 'load',
          message: msg('storefront:yourAccountBagCouldNotBeLoadedRetryLoadingYourBag'),
        })
      }
    }
    async function execute(): Promise<ServerCart | null> {
      const owner = get().owner,
        current = operation,
        transport = api,
        token = generation
      if (!owner || !current || !transport) return null
      return runCartOperation({
        owner,
        current,
        transport,
        isActive: () => active(owner, token),
        set,
        apply,
        disk,
        warning,
        clearOperation: () => {
          operation = undefined
        },
        mergeNext,
        identify: () => get().identify(undefined),
      })
    }
    function freeze(source: 'guest' | 'legacy', items: CartItem[]) {
      const owner = get().owner
      if (!owner || !get().revision || !items.length) return false
      const guestId = source === 'guest' ? guest.current.guestId : disk.legacyId
      const record: PendingMerge = {
        owner,
        source,
        guestId,
        items: items.map(({ id, quantity }) => ({ bookId: id, quantity })),
        expectedRevision: get().revision!,
        requestKey: guestId,
      }
      if (!disk.savePending(record)) {
        set({
          status: 'error',
          message: msg('storefront:tooManyUnresolvedGuestMergesRecoverAnEarlierAccountMergeBefore'),
          retryKind: 'load',
        })
        return false
      }
      if (source === 'guest') {
        guest.reset()
      } else {
        disk.discardLegacy(false)
        set({ legacyItems: [] })
      }
      operation = { kind: 'merge', record }
      warning()
      return true
    }
    async function mergeNext() {
      const owner = get().owner
      if (!owner || get().status !== 'ready') return
      const token = generation
      set({ status: 'merging' })
      const claimed = await withCartStorageLock(() => {
        if (!active(owner, token) || get().status !== 'merging') return false
        synchronize()
        const pending = disk.pending(owner)
        if (pending) {
          operation = { kind: 'merge', record: pending }
          return true
        }
        return freeze('guest', guest.current.items)
      })
      if (!active(owner, token)) return
      if (!claimed) {
        if (get().status === 'merging') set({ status: 'ready' })
        return
      }
      await execute()
    }
    return {
      items: guest.current.items,
      owner: null,
      status: 'guest',
      message: '',
      validationMessage: '',
      notices: [],
      retryKind: 'load',
      storageWarning: disk.warning(),
      legacyItems: disk.legacy,
      legacyUnreadable: disk.legacyUnreadable,
      identify: async (owner, transport) => {
        // Storage events synchronize the existing guest owner without cancelling its queued edits.
        if (owner === null && get().owner === null) {
          synchronize()
          return
        }
        generation++
        accepted++
        readSequence++
        api = transport
        operation = undefined
        if (owner === null) synchronize()
        set({
          owner,
          items: owner === null ? guest.current.items : [],
          revision: undefined,
          status: owner === null ? 'guest' : 'loading',
          message: '',
          validationMessage: '',
          notices: [],
        })
        if (owner) {
          const token = generation
          await read(true)
          if (active(owner, token)) await mergeNext()
        }
      },
      add: async (book, quantity = 1) => {
        const owner = get().owner,
          token = generation
        const reject = (validationMessage: string) => {
          set({ validationMessage })
          return false
        }
        const invalid = (items: CartItem[]) => {
          const existing = items.find((item) => item.id === book.id)
          if (!Number.isInteger(quantity) || quantity < 1)
            return msg('storefront:chooseAPositiveWholeNumberQuantity')
          if (owner !== null && existing?.available === false)
            return msg('storefront:thisBookIsUnavailableInYourAccountBagReviewAvailabilityBefore')
          if (book.stock < 1) return msg('storefront:thisBookIsSoldOut')
          const stock =
            owner !== null && existing ? Math.min(book.stock, existing.stock) : book.stock
          if ((existing?.quantity ?? 0) + quantity > Math.min(10, stock))
            return msg('storefront:thisAdditionExceedsAvailableStockOrTheTenCopyBagLimit')
          if (!existing && items.length >= 20)
            return msg('storefront:yourBagCanHoldAtMostTwentyTitles')
          return ''
        }
        if (cartBlocked(get())) return false
        try {
          if (owner === null) {
            const result = await withCartStorageLock(() => {
              if (generation !== token || get().owner !== null || cartBlocked(get())) return false
              synchronize()
              const reason = invalid(guest.current.items)
              if (reason) return reject(reason)
              persistGuest(addToCart(guest.current.items, book, quantity))
              set({ validationMessage: '' })
              return true
            })
            return result && generation === token && get().owner === null
          }
          const reason = invalid(get().items)
          if (reason) return reject(reason)
          if (!owner || !get().revision || !api) return false
          const target = (get().items.find((item) => item.id === book.id)?.quantity ?? 0) + quantity
          operation = {
            kind: 'set',
            input: {
              bookId: book.id,
              quantity: target,
              expectedRevision: get().revision!,
              requestKey: crypto.randomUUID(),
            },
          }
          const saved = await execute()
          const complete =
            saved !== null &&
            saved.items.find((item) => item.bookId === book.id)?.quantity === target &&
            active(owner, token) &&
            (get().items.find((item) => item.id === book.id)?.quantity ?? 0) >= target
          if (saved && active(owner, token) && !complete)
            set({
              validationMessage: msg(
                'storefront:yourBagWasAdjustedReviewAvailabilityBeforeAddingAgain',
              ),
            })
          return complete
        } catch {
          if (generation === token && get().owner === owner)
            set({
              validationMessage: msg('storefront:thisAdditionCouldNotBeConfirmedPleaseTryAgain'),
            })
          return false
        }
      },
      update: (id, quantity) => {
        if (cartBlocked(get()) || !Number.isInteger(quantity) || quantity < 0 || quantity > 10)
          return
        if (get().owner === null) {
          editGuest((items) => changeQuantity(items, id, quantity))
        } else if (get().owner && get().revision && api) {
          operation = {
            kind: 'set',
            input: {
              bookId: id,
              quantity,
              expectedRevision: get().revision!,
              requestKey: crypto.randomUUID(),
            },
          }
          void execute()
        }
      },
      clear: () => {
        if (get().owner === null) editGuest(() => [])
      },
      refresh: () => read(),
      retry: async () => {
        if (!get().owner || ['saving', 'merging', 'loading'].includes(get().status)) return
        if (operation) await execute()
        else {
          set({ status: 'loading' })
          const token = generation,
            owner = get().owner!
          await read(true)
          if (active(owner, token)) await mergeNext()
        }
      },
      importLegacy: async () => {
        const owner = get().owner,
          token = generation
        if (!owner || get().status !== 'ready') return
        set({ status: 'merging' })
        const claimed = await withCartStorageLock(() => {
          if (!active(owner, token) || get().status !== 'merging') return false
          synchronize()
          return freeze('legacy', get().legacyItems)
        })
        if (claimed && active(owner, token)) await execute()
        else if (active(owner, token) && get().status === 'merging') set({ status: 'ready' })
      },
      discardLegacy: () => {
        void withCartStorageLock(() => {
          synchronize()
          disk.discardLegacy()
          set({ legacyItems: [], legacyUnreadable: false })
          warning()
        })
      },
    }
  })
  return store
}
export const useCartStore = createCartStore()
