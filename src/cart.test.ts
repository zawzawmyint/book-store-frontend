import { describe, expect, it } from 'vitest'
import { addToCart, cartCount, cartTotal, changeQuantity } from './cart'

const book = {
  id: '1',
  title: 'The Great Gatsby',
  author: 'F. Scott Fitzgerald',
  priceCents: 1699,
  stock: 12,
  genre: 'Classic Fiction',
}

describe('cart', () => {
  it('adds a book once and increases its quantity', () => {
    const first = addToCart([], book)
    const next = addToCart(first, book)
    expect(next).toHaveLength(1)
    expect(cartCount(next)).toBe(2)
    expect(cartTotal(next)).toBe(3398)
  })

  it('caps quantity at stock and removes items at zero', () => {
    const item = { ...book, stock: 2 }
    const cart = addToCart(addToCart(addToCart([], item), item), item)
    expect(cart[0].quantity).toBe(2)
    expect(changeQuantity(cart, item.id, 0)).toEqual([])
  })
})
