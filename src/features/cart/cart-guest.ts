import type { CartItem } from './cart'
import type { CartState } from './cart-store'
import { freshGuest, withCartStorageLock, type cartPersistence } from './cart-persistence'

/** Guest persistence stays separate from the visible server-owned account cart. */
export function createGuestCart(
  disk: ReturnType<typeof cartPersistence>,
  {
    set,
    get,
    generation,
    warning,
  }: {
    set: (state: Partial<CartState>) => void
    get: () => CartState
    generation: () => number
    warning: () => void
  },
) {
  let guest = disk.guest
  const persist = (items: CartItem[]) => {
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
  const edit = (edit: (items: CartItem[]) => CartItem[]) => {
    const token = generation()
    void withCartStorageLock(() => {
      if (generation() !== token || get().owner !== null) return
      synchronize()
      persist(edit(guest.items))
    })
  }

  return {
    get current() {
      return guest
    },
    persist,
    synchronize,
    edit,
    reset() {
      guest = freshGuest()
      disk.saveGuest(guest)
    },
  }
}
