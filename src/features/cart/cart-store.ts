import { initializeDeliveryBrowserData } from '../checkout/browser-cutover'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { PersistStorage } from 'zustand/middleware'
import { CART_STORAGE_KEY, addToCart, changeQuantity, loadCart } from './cart'
import type { BookSummary, CartItem } from './cart'

type CartState = {
  items: CartItem[]
  add: (book: BookSummary) => void
  update: (id: string, quantity: number) => void
  clear: () => void
}

// Keep the existing raw array format so carts saved before Zustand still load.
const cartStorage: PersistStorage<Pick<CartState, 'items'>> = {
  getItem: () => ({ state: { items: loadCart() } }),
  setItem: (name, value) => {
    try {
      localStorage.setItem(name, JSON.stringify(value.state.items))
    } catch {
      // The in-memory cart remains usable when storage is denied or full.
    }
  },
  removeItem: (name) => {
    try {
      localStorage.removeItem(name)
    } catch {
      // Storage may be unavailable in private browsing or restricted contexts.
    }
  },
}

initializeDeliveryBrowserData()

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      add: (book) => set((state) => ({ items: addToCart(state.items, book) })),
      update: (id, quantity) =>
        set((state) => ({ items: changeQuantity(state.items, id, quantity) })),
      clear: () => set({ items: [] }),
    }),
    {
      name: CART_STORAGE_KEY,
      storage: cartStorage,
      partialize: (state) => ({ items: state.items }),
    },
  ),
)
