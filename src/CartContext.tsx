import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { addToCart, cartCount, cartTotal, changeQuantity, loadCart } from './cart'
import type { CartItem } from './cart'
import { CartContext } from './cart-context'
import type { CartContextValue } from './cart-context'

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(loadCart)
  useEffect(() => {
    localStorage.setItem('book-store-cart', JSON.stringify(items))
  }, [items])
  const value = useMemo<CartContextValue>(
    () => ({
      items,
      count: cartCount(items),
      total: cartTotal(items),
      add: (book) => setItems((current) => addToCart(current, book)),
      update: (id, quantity) => setItems((current) => changeQuantity(current, id, quantity)),
      clear: () => setItems([]),
    }),
    [items],
  )
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}
