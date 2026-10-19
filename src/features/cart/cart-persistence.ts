import { CART_STORAGE_KEY, type CartItem } from './cart'
export const LEGACY_CART_KEY = 'book-store-cart-legacy-import'
export const PENDING_MERGES_KEY = 'book-store-cart-pending-merges'
const UNREADABLE_CART_KEY = 'book-store-cart-unreadable'
const LEGACY_ID_KEY = 'book-store-cart-legacy-id'
const editWarningKey = (owner: string) => `book-store-cart-unconfirmed:${owner}`
/** A warning marker only: ordinary edit payloads are deliberately not persisted. */
export function markUnconfirmedCartEdit(owner: string, requestKey: string) {
  try {
    sessionStorage.setItem(editWarningKey(owner), requestKey)
  } catch {
    /* Same-page retry remains available. */
  }
}
export function acknowledgeCartEdit(owner: string, requestKey?: string) {
  try {
    const key = editWarningKey(owner)
    const marker = sessionStorage.getItem(key)
    if (marker && (!requestKey || marker === requestKey)) {
      sessionStorage.removeItem(key)
      return true
    }
  } catch {
    /* No reload recovery is promised when storage is unavailable. */
  }
  return false
}
export function withCartStorageLock<T>(action: () => T | Promise<T>): Promise<T> {
  return typeof navigator !== 'undefined' && navigator.locks
    ? navigator.locks.request('book-store-cart-ownership', action)
    : Promise.resolve(action())
}
export type GuestCart = { version: 2; guestId: string; items: CartItem[] }
export type PendingMerge = {
  owner: string
  guestId: string
  source: 'guest' | 'legacy'
  requestKey: string
  expectedRevision: string
  items: { bookId: string; quantity: number }[]
}
const uuid = (value: unknown): value is string =>
  typeof value === 'string' &&
  /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(value)
const validLines = (value: unknown): value is PendingMerge['items'] =>
  Array.isArray(value) &&
  value.length <= 20 &&
  value.every(
    (line) =>
      /^[1-9]\d*$/.test(line?.bookId) &&
      Number.isSafeInteger(Number(line.bookId)) &&
      Number.isInteger(line.quantity) &&
      line.quantity >= 1 &&
      line.quantity <= 10,
  ) &&
  new Set(value.map((line) => line.bookId)).size === value.length
export function validatedItems(value: unknown, legacy = false): CartItem[] {
  if (!Array.isArray(value)) return []
  const ids = new Set<string>()
  return value
    .filter((item): item is CartItem => {
      if (
        !item ||
        typeof item.id !== 'string' ||
        !/^[1-9]\d*$/.test(item.id) ||
        !Number.isSafeInteger(Number(item.id)) ||
        ids.has(item.id) ||
        typeof item.title !== 'string' ||
        typeof item.author !== 'string' ||
        typeof item.genre !== 'string' ||
        !Number.isInteger(item.priceCents) ||
        item.priceCents < 0 ||
        !Number.isInteger(item.quantity) ||
        item.quantity < 1 ||
        (!legacy && item.quantity > 10) ||
        !Number.isInteger(item.stock) ||
        item.stock < item.quantity
      )
        return false
      ids.add(item.id)
      return ids.size <= 20
    })
    .map(({ id, title, author, genre, priceCents, stock, quantity }) => ({
      id,
      title,
      author,
      genre,
      priceCents,
      stock,
      quantity: Math.min(10, quantity),
    }))
}
export const freshGuest = (): GuestCart => ({ version: 2, guestId: crypto.randomUUID(), items: [] })
export function cartPersistence() {
  let warning = ''
  let memoryOnly = false
  const unavailable = () => {
    memoryOnly = true
    warning =
      'Browser storage is unavailable. Guest and merge recovery after reload is unavailable.'
  }
  const read = (key: string): string | null => {
    try {
      return localStorage.getItem(key)
    } catch {
      unavailable()
      return null
    }
  }
  const write = (key: string, value: unknown) => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
      return true
    } catch {
      unavailable()
      return false
    }
  }
  let pending: PendingMerge[] = []
  function refreshPending() {
    if (memoryOnly) return
    try {
      const raw = JSON.parse(read(PENDING_MERGES_KEY) || '[]') as unknown
      if (Array.isArray(raw) && raw.length <= 10)
        pending = raw.filter(
          (record): record is PendingMerge =>
            !!record &&
            typeof record.owner === 'string' &&
            record.owner.length <= 200 &&
            uuid(record.guestId) &&
            uuid(record.requestKey) &&
            /^(0|[1-9]\d*)$/.test(record.expectedRevision) &&
            ['guest', 'legacy'].includes(record.source) &&
            validLines(record.items),
        )
    } catch {
      warning = 'Saved merge recovery is unavailable. Please check your account bag.'
    }
  }
  refreshPending()
  let legacy: CartItem[] = []
  const readLegacy = (value: unknown) => {
    if (
      Array.isArray(value) &&
      (value.length > 20 || value.some((item) => item?.quantity > 10)) &&
      !warning
    )
      warning =
        'Saved browser selections are limited to twenty titles and ten copies per book. Review the adjusted import before adding it to your account.'
    return validatedItems(value, true)
  }
  let legacyUnreadable = read(UNREADABLE_CART_KEY) !== null
  let legacyId: unknown
  try {
    legacyId = JSON.parse(read(LEGACY_ID_KEY) || 'null')
  } catch {
    legacyId = undefined
  }
  if (!uuid(legacyId)) {
    legacyId = crypto.randomUUID()
    write(LEGACY_ID_KEY, legacyId)
  }
  try {
    legacy = readLegacy(JSON.parse(read(LEGACY_CART_KEY) || '[]'))
  } catch {
    legacyUnreadable = true
  }
  let guest = freshGuest()
  const raw = read(CART_STORAGE_KEY)
  try {
    const saved: unknown = raw ? JSON.parse(raw) : null
    if (Array.isArray(saved)) {
      if (read(LEGACY_CART_KEY) !== JSON.stringify(saved)) {
        legacyId = crypto.randomUUID()
        write(LEGACY_ID_KEY, legacyId)
      }
      legacy = readLegacy(saved)
      // Archive before replacing the old key; a failed archive leaves the original recoverable.
      if (write(LEGACY_CART_KEY, saved)) write(CART_STORAGE_KEY, guest)
    } else if (
      saved &&
      typeof saved === 'object' &&
      'version' in saved &&
      saved.version === 2 &&
      'guestId' in saved &&
      uuid(saved.guestId) &&
      'items' in saved
    ) {
      guest = { version: 2, guestId: saved.guestId, items: validatedItems(saved.items) }
    } else if (raw) legacyUnreadable = true
  } catch {
    legacyUnreadable = true
  }
  if (legacyUnreadable && raw && read(UNREADABLE_CART_KEY) === null) write(UNREADABLE_CART_KEY, raw)
  if (pending.some((record) => record.source === 'guest' && record.guestId === guest.guestId))
    guest = freshGuest()
  if (pending.some((record) => record.source === 'legacy')) legacy = []
  function synchronize() {
    refreshPending()
    if (!memoryOnly) {
      try {
        const saved = JSON.parse(read(CART_STORAGE_KEY) || 'null') as GuestCart | null
        if (saved?.version === 2 && uuid(saved.guestId))
          guest = { version: 2, guestId: saved.guestId, items: validatedItems(saved.items) }
        legacy = readLegacy(JSON.parse(read(LEGACY_CART_KEY) || '[]'))
      } catch {
        /* Preserve the in-memory view of an unreadable saved payload. */
      }
    }
    if (pending.some((record) => record.source === 'guest' && record.guestId === guest.guestId)) {
      guest = freshGuest()
    }
    if (pending.some((record) => record.source === 'legacy')) legacy = []
    return { guest, legacy, legacyUnreadable }
  }
  return {
    guest,
    legacy,
    legacyUnreadable,
    get legacyId() {
      return legacyId as string
    },
    synchronize,
    warning: () => warning,
    saveGuest: (value: GuestCart) => {
      guest = { ...value, items: validatedItems(value.items) }
      return write(CART_STORAGE_KEY, guest)
    },
    discardLegacy: (rotateIdentity = true) => {
      legacy = []
      legacyUnreadable = false
      write(LEGACY_CART_KEY, [])
      if (rotateIdentity) {
        legacyId = crypto.randomUUID()
        write(LEGACY_ID_KEY, legacyId)
      }
      try {
        localStorage.removeItem(UNREADABLE_CART_KEY)
      } catch {
        unavailable()
      }
      write(CART_STORAGE_KEY, guest)
    },
    pending: (owner: string) => {
      refreshPending()
      return pending.find((record) => record.owner === owner)
    },
    savePending: (record: PendingMerge) => {
      refreshPending()
      const index = pending.findIndex((value) => value.requestKey === record.requestKey)
      if (index >= 0) pending[index] = record
      else if (pending.length < 10) pending.push(record)
      else return false
      write(PENDING_MERGES_KEY, pending)
      return true
    },
    completePending: (record: PendingMerge) => {
      refreshPending()
      if (record.source === 'guest') {
        try {
          const saved = JSON.parse(read(CART_STORAGE_KEY) || 'null') as GuestCart | null
          if (saved?.guestId === record.guestId) {
            guest = freshGuest()
            write(CART_STORAGE_KEY, guest)
          }
        } catch {
          /* Keep unreadable originals in their recovery slot. */
        }
      } else {
        try {
          legacyId = JSON.parse(read(LEGACY_ID_KEY) || 'null')
        } catch {
          /* Retain the current identity. */
        }
        if (legacyId === record.guestId) {
          legacyId = crypto.randomUUID()
          write(LEGACY_ID_KEY, legacyId)
        }
      }
      pending = pending.filter((value) => value.requestKey !== record.requestKey)
      write(PENDING_MERGES_KEY, pending)
    },
  }
}
