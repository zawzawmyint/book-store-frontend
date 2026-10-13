import { create } from 'zustand'
import { CombinedGraphQLErrors } from '@apollo/client'
import { addToCart, changeQuantity, type BookSummary, type CartItem } from './cart'
import {
  cartPersistence,
  freshGuest,
  withCartStorageLock,
  markUnconfirmedCartEdit,
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
type Operation = { kind: 'set'; input: SetCartInput } | { kind: 'merge'; record: PendingMerge }
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
  add: (book: BookSummary) => void
  update: (id: string, quantity: number) => void
  clear: () => void
  identify: (owner: string | null | undefined, api?: CartTransport) => Promise<void>
  refresh: () => Promise<void>
  retry: () => Promise<void>
  importLegacy: () => Promise<void>
  discardLegacy: () => void
}
const errorCode = (error: unknown) =>
  CombinedGraphQLErrors.is(error)
    ? error.errors[0]?.extensions?.code
    : (error as { code?: string })?.code
export const cartBlocked = (state: Pick<CartState, 'status'>) =>
  !['ready', 'guest'].includes(state.status)
export const checkoutCartReady = (state: CartState) =>
  state.owner != null &&
  state.status === 'ready' &&
  state.items.length > 0 &&
  state.items.every((item) => item.available !== false && item.stock >= item.quantity)
export function createCartStore() {
  const disk = cartPersistence()
  let guest = disk.guest
  let api: CartTransport | undefined
  let generation = 0
  let accepted = 0
  let readSequence = 0
  let operation: Operation | undefined
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
    const persistGuest = (items: CartItem[]) => {
      guest = { ...guest, guestId: crypto.randomUUID(), items }
      disk.saveGuest(guest)
      if (get().owner === null) set({ items })
      warning()
    }
    const synchronize = () => {
      const current = disk.synchronize()
      guest = current.guest
      set({ legacyItems: current.legacy })
      if (get().owner === null) set({ items: guest.items })
      warning()
    }
    const editGuest = (edit: (items: CartItem[]) => CartItem[]) => {
      void withCartStorageLock(() => {
        synchronize()
        persistGuest(edit(guest.items))
      })
    }
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
              ? 'Your bag was reloaded. An unconfirmed edit may not have been saved.'
              : ''
            : 'Your bag is up to date.',
        })
      } catch (error) {
        if (
          !active(owner, token) ||
          epoch !== accepted ||
          sequence !== readSequence ||
          (!initial && cartBlocked(get()))
        )
          return
        if (errorCode(error) === 'UNAUTHENTICATED') {
          await get().identify(undefined)
          return
        }
        set({
          status: 'error',
          retryKind: 'load',
          message: 'Your account bag could not be loaded. Retry loading your bag.',
        })
      }
    }
    async function execute() {
      const owner = get().owner,
        current = operation,
        transport = api,
        token = generation
      if (!owner || !current || !transport) return
      if (current.kind === 'set') markUnconfirmedCartEdit(owner, current.input.requestKey)
      set({
        status: current.kind === 'merge' ? 'merging' : 'saving',
        message: '',
        retryKind: current.kind === 'merge' ? 'merge' : 'save',
        validationMessage: '',
        notices: [],
      })
      try {
        const cart =
          current.kind === 'merge'
            ? await transport.merge({
                items: current.record.items,
                requestKey: current.record.requestKey,
                expectedRevision: current.record.expectedRevision,
              })
            : await transport.set(current.input)
        // A completed merge may retire durable recovery even after the owner leaves,
        // but its response must never populate the next account's visible bag.
        if (current.kind === 'merge')
          await withCartStorageLock(() => disk.completePending(current.record))
        else acknowledgeCartEdit(owner, current.input.requestKey)
        if (!active(owner, token)) return
        apply(cart)
        operation = undefined
        set({ status: 'ready', message: 'Bag saved.' })
        warning()
        await mergeNext()
      } catch (error) {
        if (!active(owner, token)) return
        if (errorCode(error) === 'UNAUTHENTICATED') {
          await get().identify(undefined)
          return
        }
        if (current.kind === 'set' && errorCode(error) === 'BAD_USER_INPUT') {
          operation = undefined
          acknowledgeCartEdit(owner, current.input.requestKey)
          set({ status: 'loading' })
          try {
            const cart = await transport.read()
            if (!active(owner, token)) return
            apply(cart)
            set({
              status: 'ready',
              message: '',
              validationMessage: `${error instanceof Error ? error.message : 'This selection could not be saved.'} Review availability, then decrease or remove unavailable selections.`,
            })
          } catch {
            if (active(owner, token))
              set({
                status: 'error',
                retryKind: 'load',
                message:
                  'This selection was rejected. Reload your bag to review current availability before trying again.',
              })
          }
          return
        }
        if (errorCode(error) === 'CART_CONFLICT') {
          set({ status: 'loading' })
          try {
            const cart = await transport.read()
            if (!active(owner, token)) return
            apply(cart)
            if (current.kind === 'merge') {
              current.record = { ...current.record, expectedRevision: cart.revision }
              await withCartStorageLock(() => disk.savePending(current.record))
              if (!active(owner, token)) return
            } else current.input = { ...current.input, expectedRevision: cart.revision }
            set({
              status: 'conflict',
              message:
                'Your bag changed elsewhere. Review the latest selections, then retry your intended change.',
            })
          } catch {
            if (active(owner, token))
              set({
                status: 'error',
                message:
                  'Your bag changed elsewhere, but the latest selections could not be loaded. Retry to check again.',
              })
          }
        } else
          set({
            status: 'error',
            message: `${current.kind === 'merge' ? 'Guest merge' : 'Bag save'} could not be confirmed. Retry the same operation to recover safely.`,
          })
        warning()
      }
    }
    function freeze(source: 'guest' | 'legacy', items: CartItem[]) {
      const owner = get().owner
      if (!owner || !get().revision || !items.length) return false
      const guestId = source === 'guest' ? guest.guestId : disk.legacyId
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
          message:
            'Too many unresolved guest merges. Recover an earlier account merge before adding another.',
          retryKind: 'load',
        })
        return false
      }
      if (source === 'guest') {
        guest = freshGuest()
        disk.saveGuest(guest)
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
        return freeze('guest', guest.items)
      })
      if (!active(owner, token)) return
      if (!claimed) {
        if (get().status === 'merging') set({ status: 'ready' })
        return
      }
      await execute()
    }
    return {
      items: guest.items,
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
        generation++
        accepted++
        readSequence++
        api = transport
        operation = undefined
        if (owner === null) synchronize()
        set({
          owner,
          items: owner === null ? guest.items : [],
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
      add: (book) => {
        if (cartBlocked(get())) return
        if (get().owner === null) {
          editGuest((items) => addToCart(items, book))
        } else {
          const existing = get().items.find((item) => item.id === book.id)
          if (book.stock < 1 || (existing && existing.quantity >= Math.min(10, book.stock))) return
          get().update(book.id, (existing?.quantity ?? 0) + 1)
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
