// @vitest-environment jsdom
import { beforeEach, expect, it, vi } from 'vitest'
import { createCartStore, type CartTransport, type ServerCart } from './cart-store'
import { CART_STORAGE_KEY } from './cart'
const book = {
  id: '1',
  title: 'Book',
  author: 'Author',
  genre: 'Fiction',
  stock: 10,
  priceCents: 1200,
}
const cart = (revision = '0', quantity = 0): ServerCart => ({
  revision,
  items: quantity
    ? [{ ...book, bookId: '1', quantity, lineVersion: revision, available: true }]
    : [],
  mergeNotices: [],
})
const deferred = <T>() => {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}
const transport = (): CartTransport => ({
  read: vi.fn(async () => cart()),
  set: vi.fn(async () => cart('1', 1)),
  merge: vi.fn(async () => cart('1', 1)),
})
beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
})
it('requires consent for legacy selections and persists new guest data separately', async () => {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify([{ ...book, quantity: 2 }]))
  const store = createCartStore()
  expect(store.getState().items).toEqual([])
  expect(store.getState().legacyItems).toEqual([{ ...book, quantity: 2 }])
  const api = transport()
  await store.getState().identify('A', api)
  expect(api.merge).not.toHaveBeenCalled()
  await store.getState().importLegacy()
  expect(api.merge).toHaveBeenCalledOnce()
  expect(store.getState().legacyItems).toEqual([])
  expect(JSON.parse(localStorage.getItem(CART_STORAGE_KEY)!)).toMatchObject({
    version: 2,
    items: [],
  })
})
it('rejects an old account response and hides its items during identity resolution', async () => {
  const store = createCartStore()
  const pending = deferred<ServerCart>()
  const api = transport()
  api.read = vi.fn(() => pending.promise)
  const loading = store.getState().identify('A', api)
  await store.getState().identify(undefined, api)
  expect(store.getState().items).toEqual([])
  pending.resolve(cart('2', 2))
  await loading
  expect(store.getState().items).toEqual([])
  await store.getState().identify('B', transport())
  expect(store.getState().items).toEqual([])
})
it('binds a lost merge to A across reload and retries the same snapshot and key', async () => {
  const store = createCartStore()
  store.getState().add(book)
  const api = transport()
  api.merge = vi.fn(async () => {
    throw new Error('Lost response')
  })
  await store.getState().identify('A', api)
  const sent = vi.mocked(api.merge).mock.calls[0][0]
  expect(store.getState().status).toBe('error')
  const reloaded = createCartStore()
  await reloaded.getState().identify('B', api)
  expect(api.merge).toHaveBeenCalledOnce()
  expect(reloaded.getState().items).toEqual([])
  const recovery = transport()
  await reloaded.getState().identify('A', recovery)
  expect(vi.mocked(recovery.merge).mock.calls[0][0]).toEqual(sent)
  expect(reloaded.getState().items[0].quantity).toBe(1)
  expect(JSON.stringify(localStorage)).not.toContain('lineVersion')
})
it('serializes saves and retries a failed write with the exact key', async () => {
  const store = createCartStore()
  const api = transport()
  const pending = deferred<ServerCart>()
  api.set = vi.fn(() => pending.promise)
  await store.getState().identify('A', api)
  store.getState().add(book)
  store.getState().add(book)
  expect(api.set).toHaveBeenCalledOnce()
  expect(store.getState().status).toBe('saving')
  pending.resolve(cart('1', 1))
  await vi.waitFor(() => expect(store.getState().status).toBe('ready'))
  api.set = vi.fn(async () => {
    throw new Error('Offline')
  })
  store.getState().update('1', 2)
  await vi.waitFor(() => expect(store.getState().status).toBe('error'))
  const sent = vi.mocked(api.set).mock.calls[0][0]
  api.set = vi.fn(async () => cart('2', 2))
  await store.getState().retry()
  expect(vi.mocked(api.set).mock.calls[0][0]).toEqual(sent)
})
it('loads conflict truth and waits for explicit retry of the intended edit', async () => {
  const store = createCartStore()
  const api = transport()
  await store.getState().identify('A', api)
  api.read = vi.fn(async () => cart('4', 3))
  api.set = vi.fn(async () => {
    throw Object.assign(new Error('Changed'), { code: 'CART_CONFLICT' })
  })
  store.getState().add(book)
  await vi.waitFor(() => expect(store.getState().status).toBe('conflict'))
  expect(store.getState().items[0].quantity).toBe(3)
  expect(api.set).toHaveBeenCalledOnce()
  api.set = vi.fn(async () => cart('5', 1))
  await store.getState().retry()
  expect(vi.mocked(api.set).mock.calls[0][0]).toMatchObject({ quantity: 1, expectedRevision: '4' })
})
it('ignores a background read started before an accepted mutation', async () => {
  const store = createCartStore()
  const api = transport()
  await store.getState().identify('A', api)
  const old = deferred<ServerCart>()
  api.read = vi.fn(() => old.promise)
  const refresh = store.getState().refresh()
  store.getState().add(book)
  await vi.waitFor(() => expect(store.getState().revision).toBe('1'))
  old.resolve(cart())
  await refresh
  expect(store.getState().items[0].quantity).toBe(1)
})
it('keeps guest actions usable and reports when persistence is unavailable', () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('Quota')
  })
  try {
    const store = createCartStore()
    store.getState().add(book)
    expect(store.getState().items[0].quantity).toBe(1)
    expect(store.getState().storageWarning).toContain('reload')
  } finally {
    vi.restoreAllMocks()
  }
})

it('keeps an in-flight save unresolved when an older background read fails', async () => {
  const store = createCartStore()
  const api = transport()
  await store.getState().identify('A', api)
  let reject!: (error: Error) => void
  api.read = () =>
    new Promise((_resolve, fail) => {
      reject = fail
    })
  const refresh = store.getState().refresh()
  const save = deferred<ServerCart>()
  api.set = () => save.promise
  store.getState().add(book)
  reject(new Error('Read offline'))
  await refresh
  expect(store.getState().status).toBe('saving')
  save.resolve(cart('1', 1))
})

it('shares one frozen guest operation between tabs instead of merging the snapshot twice', async () => {
  const first = createCartStore()
  first.getState().add(book)
  const second = createCartStore()
  const response = deferred<ServerCart>()
  const api = transport()
  api.merge = vi.fn(() => response.promise)
  const loadingFirst = first.getState().identify('A', api)
  await vi.waitFor(() => expect(api.merge).toHaveBeenCalledOnce())
  const loadingSecond = second.getState().identify('A', api)
  await vi.waitFor(() => expect(api.merge).toHaveBeenCalledTimes(2))
  expect(vi.mocked(api.merge).mock.calls[1][0]).toEqual(vi.mocked(api.merge).mock.calls[0][0])
  response.resolve(cart('1', 1))
  await Promise.all([loadingFirst, loadingSecond])
})

it('warns after reloading an unconfirmed ordinary edit without replaying it', async () => {
  const original = createCartStore()
  const api = transport()
  await original.getState().identify('A', api)
  api.set = () => new Promise(() => {})
  original.getState().add(book)
  const reloaded = createCartStore()
  const next = transport()
  await reloaded.getState().identify('A', next)
  expect(reloaded.getState().message).toContain('may not have been saved')
  expect(next.set).not.toHaveBeenCalled()
})

it('keeps legacy book selections when their old quantity exceeds the new ten-copy limit', () => {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify([{ ...book, stock: 20, quantity: 12 }]))
  const store = createCartStore()
  expect(store.getState().legacyItems[0]).toMatchObject({ id: '1', quantity: 10 })
  expect(store.getState().storageWarning).toContain('ten copies')
})

it('queues guest edits behind the same ownership lock used to claim merges', async () => {
  const descriptor = Object.getOwnPropertyDescriptor(navigator, 'locks')
  const release = deferred<void>()
  let tail = release.promise
  Object.defineProperty(navigator, 'locks', {
    configurable: true,
    value: {
      request: (_name: string, action: () => unknown) => {
        const next = tail.then(action)
        tail = next.then(() => {})
        return next
      },
    },
  })
  try {
    const first = createCartStore()
    const second = createCartStore()
    first.getState().add(book)
    second.getState().add({ ...book, id: '2', title: 'Second book' })
    expect(first.getState().items).toEqual([])
    release.resolve()
    await vi.waitFor(() =>
      expect(JSON.parse(localStorage.getItem(CART_STORAGE_KEY)!).items).toHaveLength(2),
    )
  } finally {
    if (descriptor) Object.defineProperty(navigator, 'locks', descriptor)
    else Reflect.deleteProperty(navigator, 'locks')
  }
})

it('uses a new key when a second legacy snapshot arrives after the first import', async () => {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify([{ ...book, quantity: 1 }]))
  const first = createCartStore()
  const api = transport()
  await first.getState().identify('A', api)
  await first.getState().importLegacy()
  const firstKey = vi.mocked(api.merge).mock.calls[0][0].requestKey
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify([{ ...book, quantity: 2 }]))
  const second = createCartStore()
  await second.getState().identify('A', api)
  await second.getState().importLegacy()
  expect(vi.mocked(api.merge).mock.calls[1][0].requestKey).not.toBe(firstKey)
})

it('preserves the legacy snapshot identity across reload before consent', () => {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify([{ ...book, quantity: 1 }]))
  createCartStore()
  const firstId = localStorage.getItem('book-store-cart-legacy-id')
  createCartStore()
  expect(localStorage.getItem('book-store-cart-legacy-id')).toBe(firstId)
})

it('retains adjusted merge notices over passive refresh', async () => {
  const store = createCartStore()
  store.getState().add(book)
  const api = transport()
  api.merge = async () => ({
    ...cart('1', 1),
    mergeNotices: [{ bookId: '1', reason: 'QUANTITY_LIMIT' }],
  })
  await store.getState().identify('staff-account', api)
  await store.getState().refresh()
  expect(store.getState().notices).toEqual([{ bookId: '1', reason: 'QUANTITY_LIMIT' }])
})

it('allows repair after a definite stock validation rejection without replaying the invalid edit', async () => {
  const store = createCartStore()
  const api = transport()
  await store.getState().identify('A', api)
  api.read = async () => ({
    ...cart('1', 2),
    items: cart('1', 2).items.map((item) => ({ ...item, stock: 1, available: false })),
  })
  api.set = vi.fn(async () => {
    throw Object.assign(new Error('Stock changed'), { code: 'BAD_USER_INPUT' })
  })
  store.getState().add(book)
  await vi.waitFor(() => expect(store.getState().status).toBe('ready'))
  expect(store.getState().items[0].available).toBe(false)
  expect(store.getState().validationMessage).toContain('Stock changed')
  api.set = vi.fn(async () => cart('2'))
  store.getState().update('1', 0)
  await vi.waitFor(() => expect(store.getState().items).toEqual([]))
  expect(api.set).toHaveBeenCalledOnce()
})
