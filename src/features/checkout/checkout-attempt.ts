type Line = { id: string; quantity: number }
type Attempt = { userId: string; requestKey: string; lines: Line[]; orderId?: string }
const memory = new Map<string, Attempt>()
const key = (userId: string) => `book-store-checkout:${userId}`
const normalized = (lines: readonly Line[]) =>
  lines.map(({ id, quantity }) => ({ id, quantity })).sort((a, b) => a.id.localeCompare(b.id))
const same = (a: readonly Line[], b: readonly Line[]) =>
  JSON.stringify(normalized(a)) === JSON.stringify(normalized(b))
function read(userId: string): Attempt | undefined {
  try {
    const raw = sessionStorage.getItem(key(userId))
    if (!raw) return undefined
    const value = JSON.parse(raw) as Attempt
    if (
      value.userId !== userId ||
      !/^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(value.requestKey) ||
      !Array.isArray(value.lines) ||
      value.lines.length < 1 ||
      value.lines.length > 20 ||
      value.lines.some(
        (line) =>
          !/^[1-9]\d*$/.test(line.id) ||
          !Number.isSafeInteger(Number(line.id)) ||
          !Number.isInteger(line.quantity) ||
          line.quantity < 1 ||
          line.quantity > 10,
      ) ||
      new Set(value.lines.map((line) => line.id)).size !== value.lines.length ||
      (value.orderId !== undefined && !/^[1-9]\d*$/.test(value.orderId))
    )
      return undefined
    return {
      userId,
      requestKey: value.requestKey,
      lines: normalized(value.lines),
      ...(value.orderId ? { orderId: value.orderId } : {}),
    }
  } catch {
    return memory.get(userId)
  }
}
export function checkoutAttempt(userId: string, lines: readonly Line[], orderId?: string): Attempt {
  const previous = read(userId)
  const attempt =
    previous && same(previous.lines, lines)
      ? previous
      : { userId, requestKey: crypto.randomUUID(), lines: normalized(lines) }
  if (orderId) attempt.orderId = orderId
  memory.set(userId, attempt)
  try {
    sessionStorage.setItem(key(userId), JSON.stringify(attempt))
  } catch {
    /* Orders offers recovery without storage. */
  }
  return attempt
}
export function confirmPaidAttempt(userId: string, orderId: string, lines: readonly Line[]) {
  const attempt = read(userId)
  if (!attempt || attempt.orderId !== orderId) return false
  const matches = same(attempt.lines, lines)
  memory.delete(userId)
  try {
    sessionStorage.removeItem(key(userId))
  } catch {
    /* Memory remains usable. */
  }
  return matches
}
export function retireUnpaidAttempt(
  userId: string,
  order: { id: string; status: string; payment: { status: string } },
) {
  if (
    order.status !== 'CANCELLED' ||
    !['PENDING', 'EXPIRED'].includes(order.payment.status) ||
    read(userId)?.orderId !== order.id
  )
    return
  memory.delete(userId)
  try {
    sessionStorage.removeItem(key(userId))
  } catch {
    /* A confirmed terminal outcome also retires the in-memory attempt. */
  }
}
export function safeCheckoutUrl(value: string) {
  try {
    const url = new URL(value)
    return url.origin === 'https://checkout.stripe.com' && !url.username && !url.password
  } catch {
    return false
  }
}
