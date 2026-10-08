import { deliveryAddressSchema, type DeliveryAddress } from './delivery-address'
type Line = { id: string; quantity: number }
export type ReviewedCheckout = {
  deliveryAddress: DeliveryAddress
  expectedDeliveryFeeCents: number
  expectedTotalCents: number
}
export type Attempt = ReviewedCheckout & {
  version: 1
  userId: string
  requestKey: string
  lines: Line[]
  orderId?: string
}
const memory = new Map<string, Attempt>()
const memoryOnly = new Set<string>()
const key = (userId: string) => `book-store-checkout:${userId}`
const normalized = (lines: readonly Line[]) =>
  lines.map(({ id, quantity }) => ({ id, quantity })).sort((a, b) => a.id.localeCompare(b.id))
const same = (a: readonly Line[], b: readonly Line[]) =>
  JSON.stringify(normalized(a)) === JSON.stringify(normalized(b))
const validMoney = (value: number) => Number.isInteger(value) && value >= 0 && value <= 2147483647
export function savedCheckoutAttempt(userId: string): Attempt | undefined {
  if (memoryOnly.has(userId)) return memory.get(userId)
  try {
    const raw = sessionStorage.getItem(key(userId))
    if (!raw || raw.length > 12000) return undefined
    const value = JSON.parse(raw) as Attempt
    const address = deliveryAddressSchema.safeParse(value.deliveryAddress)
    if (
      value.version !== 1 ||
      value.userId !== userId ||
      !address.success ||
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
      !validMoney(value.expectedDeliveryFeeCents) ||
      !validMoney(value.expectedTotalCents) ||
      value.expectedTotalCents < 50 ||
      value.expectedTotalCents < value.expectedDeliveryFeeCents + 50 ||
      (value.orderId !== undefined &&
        (!/^[1-9]\d*$/.test(value.orderId) || !Number.isSafeInteger(Number(value.orderId))))
    )
      return undefined
    return {
      version: 1,
      userId,
      requestKey: value.requestKey,
      lines: normalized(value.lines),
      deliveryAddress: address.data,
      expectedDeliveryFeeCents: value.expectedDeliveryFeeCents,
      expectedTotalCents: value.expectedTotalCents,
      ...(value.orderId ? { orderId: value.orderId } : {}),
    }
  } catch {
    return memory.get(userId)
  }
}
export function checkoutAttempt(
  userId: string,
  lines: readonly Line[],
  reviewed: ReviewedCheckout,
  orderId?: string,
): Attempt {
  const payload = {
    deliveryAddress: deliveryAddressSchema.parse(reviewed.deliveryAddress),
    expectedDeliveryFeeCents: reviewed.expectedDeliveryFeeCents,
    expectedTotalCents: reviewed.expectedTotalCents,
  }
  const previous = savedCheckoutAttempt(userId)
  const attempt: Attempt =
    previous &&
    same(previous.lines, lines) &&
    JSON.stringify({
      deliveryAddress: previous.deliveryAddress,
      expectedDeliveryFeeCents: previous.expectedDeliveryFeeCents,
      expectedTotalCents: previous.expectedTotalCents,
    }) === JSON.stringify(payload)
      ? previous
      : {
          version: 1,
          userId,
          requestKey: crypto.randomUUID(),
          lines: normalized(lines),
          ...payload,
        }
  if (orderId) attempt.orderId = orderId
  memory.set(userId, attempt)
  try {
    sessionStorage.setItem(key(userId), JSON.stringify(attempt))
    memoryOnly.delete(userId)
  } catch {
    memoryOnly.add(userId)
  }
  return attempt
}
export function clearCheckoutAttempts(userId?: string) {
  if (userId) {
    memory.delete(userId)
    memoryOnly.delete(userId)
  } else {
    memory.clear()
    memoryOnly.clear()
  }
  try {
    for (const name of Object.keys(sessionStorage))
      if (userId ? name === key(userId) : name.startsWith('book-store-checkout:'))
        sessionStorage.removeItem(name)
  } catch {
    /* Memory is also cleared. */
  }
}
export function confirmPaidAttempt(userId: string, orderId: string, lines: readonly Line[]) {
  const attempt = savedCheckoutAttempt(userId)
  if (!attempt || attempt.orderId !== orderId) return false
  const matches = same(attempt.lines, lines)
  clearCheckoutAttempts(userId)
  return matches
}
export function retireUnpaidAttempt(
  userId: string,
  order: { id: string; status: string; payment: { status: string } },
) {
  if (
    order.status === 'CANCELLED' &&
    ['PENDING', 'EXPIRED'].includes(order.payment.status) &&
    savedCheckoutAttempt(userId)?.orderId === order.id
  )
    clearCheckoutAttempts(userId)
}
export function safeCheckoutUrl(value: string) {
  try {
    const url = new URL(value)
    return url.origin === 'https://checkout.stripe.com' && !url.username && !url.password
  } catch {
    return false
  }
}
