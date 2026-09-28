import { createContext, useContext } from 'react'
import type { BookSummary, CartItem } from './cart'

export type CartContextValue = {
  items: CartItem[]
  count: number
  total: number
  add: (book: BookSummary) => void
  update: (id: string, quantity: number) => void
  clear: () => void
}

export const CartContext = createContext<CartContextValue | null>(null)

export function useCart() {
  const context = useContext(CartContext)
  if (!context) throw new Error('CartProvider is missing')
  return context
}
