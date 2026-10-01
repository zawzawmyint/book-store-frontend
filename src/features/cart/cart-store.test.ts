// @vitest-environment jsdom
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { CART_STORAGE_KEY, cartCount, cartTotal } from './cart'
import { useCartStore } from './cart-store'

const book = {
  id: '1',
  title: 'A book',
  author: 'Author',
  genre: 'Fiction',
  priceCents: 1200,
  stock: 2,
}

beforeEach(() => {
  localStorage.clear()
  useCartStore.setState({ items: [] })
})
afterEach(() => vi.restoreAllMocks())

describe('cart store', () => {
  it('adds, caps, updates and clears the cart while persisting only a raw items array', () => {
    const { add, update, clear } = useCartStore.getState()
    add(book)
    add(book)
    add(book)
    expect(cartCount(useCartStore.getState().items)).toBe(2)
    expect(cartTotal(useCartStore.getState().items)).toBe(2400)
    expect(JSON.parse(localStorage.getItem(CART_STORAGE_KEY)!)).toEqual([{ ...book, quantity: 2 }])
    update(book.id, 1)
    expect(cartTotal(useCartStore.getState().items)).toBe(1200)
    update(book.id, 0)
    expect(useCartStore.getState().items).toEqual([])
    add(book)
    clear()
    expect(localStorage.getItem(CART_STORAGE_KEY)).toBe('[]')
  })

  it('rehydrates valid legacy carts and ignores malformed rows without accepting stored actions', async () => {
    localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify([
        { ...book, quantity: 2 },
        { ...book, id: '2', quantity: -1 },
        { ...book, id: '3', priceCents: 'bad', quantity: 1 },
        null,
      ]),
    )
    await useCartStore.persist.rehydrate()
    expect(useCartStore.getState().items).toEqual([{ ...book, quantity: 2 }])
    expect(typeof useCartStore.getState().add).toBe('function')
    localStorage.setItem(CART_STORAGE_KEY, '{"items": [], "add": "invalid"}')
    await useCartStore.persist.rehydrate()
    expect(useCartStore.getState().items).toEqual([])
    expect(typeof useCartStore.getState().add).toBe('function')
  })

  it('recovers from corrupt or unavailable storage and keeps in-memory actions usable when writes fail', async () => {
    localStorage.setItem(CART_STORAGE_KEY, 'not json')
    await useCartStore.persist.rehydrate()
    expect(useCartStore.getState().items).toEqual([])
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Storage denied')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage denied')
    })
    await useCartStore.persist.rehydrate()
    expect(() => useCartStore.getState().add(book)).not.toThrow()
    expect(cartCount(useCartStore.getState().items)).toBe(1)
    expect(() => useCartStore.getState().update(book.id, 2)).not.toThrow()
    expect(cartCount(useCartStore.getState().items)).toBe(2)
    expect(() => useCartStore.getState().clear()).not.toThrow()
    expect(useCartStore.getState().items).toEqual([])
  })
})
