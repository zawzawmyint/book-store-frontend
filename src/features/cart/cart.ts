export type BookSummary = {
  id: string
  title: string
  author: string
  genre: string
  priceCents: number
  stock: number
}

export type CartItem = BookSummary & { quantity: number }

export function addToCart(cart: CartItem[], book: BookSummary): CartItem[] {
  if (book.stock < 1) return cart
  const existing = cart.find((item) => item.id === book.id)
  if (existing)
    return cart.map((item) =>
      item.id === book.id
        ? { ...item, stock: book.stock, quantity: Math.min(item.quantity + 1, book.stock) }
        : item,
    )
  return [...cart, { ...book, quantity: 1 }]
}

export function changeQuantity(cart: CartItem[], id: string, quantity: number): CartItem[] {
  if (quantity <= 0) return cart.filter((item) => item.id !== id)
  return cart.map((item) =>
    item.id === id
      ? { ...item, quantity: Math.min(Math.max(1, Math.floor(quantity)), item.stock) }
      : item,
  )
}

export const cartCount = (cart: CartItem[]) => cart.reduce((sum, item) => sum + item.quantity, 0)
export const cartTotal = (cart: CartItem[]) =>
  cart.reduce((sum, item) => sum + item.priceCents * item.quantity, 0)

export function loadCart(): CartItem[] {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem('book-store-cart') || '[]')
    if (!Array.isArray(saved)) return []
    return saved.filter(
      (item): item is CartItem =>
        typeof item?.id === 'string' &&
        typeof item?.title === 'string' &&
        typeof item?.author === 'string' &&
        typeof item?.genre === 'string' &&
        Number.isInteger(item?.priceCents) &&
        item.priceCents >= 0 &&
        Number.isInteger(item?.quantity) &&
        item.quantity > 0 &&
        Number.isInteger(item?.stock) &&
        item.stock >= item.quantity,
    )
  } catch {
    return []
  }
}
