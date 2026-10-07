import type {
  CreateSessionRequest,
  PaymentProvider,
  ProviderRefund,
  ProviderSession,
} from '../../backend/src/modules/payments/payment.provider.js'
export class BrowserPaymentProvider implements PaymentProvider {
  sessions = new Map<string, ProviderSession>()
  requests = new Map<string, CreateSessionRequest>()
  refunds = new Map<string, ProviderRefund>()
  async createSession(input: CreateSessionRequest, key: string) {
    if (this.sessions.has(key)) return this.sessions.get(key)!
    const amountCents = input.lines.reduce(
      (total, line) => total + line.quantity * line.unitPriceCents,
      0,
    )
    const session: ProviderSession = {
      id: key,
      url: `https://checkout.stripe.com/c/pay/${input.orderId}`,
      paymentIntentId: `pi_${input.orderId}`,
      expiresAt: input.expiresAt,
      status: 'open',
      paid: false,
      amountCents,
      currency: 'usd',
      livemode: false,
      orderId: input.orderId,
      intentOrderId: input.orderId,
      intentAmountCents: amountCents,
      intentCurrency: 'usd',
      intentSucceeded: false,
    }
    this.sessions.set(key, session)
    this.requests.set(input.orderId, input)
    return session
  }
  async retrieveSession(id: string) {
    const session = this.sessions.get(id)
    if (!session) throw new Error('Missing fake session')
    return { ...session }
  }
  async expireSession(id: string) {
    const session = this.sessions.get(id)!
    if (!session.paid) session.status = 'expired'
    return { ...session }
  }
  pay(orderId: string) {
    const session = [...this.sessions.values()].find((value) => value.orderId === orderId)
    if (!session) throw new Error('Missing fake session')
    Object.assign(session, { status: 'complete', paid: true, intentSucceeded: true })
    return this.requests.get(orderId)!.successUrl
  }
  async createRefund(
    input: { orderId: string; paymentIntentId: string; amountCents: number },
    key: string,
  ) {
    const previous = this.refunds.get(key)
    if (previous) return previous
    const refund: ProviderRefund = {
      ...input,
      id: key,
      currency: 'usd',
      livemode: false,
      status: 'succeeded',
    }
    this.refunds.set(key, refund)
    return refund
  }
  async retrieveRefund(id: string) {
    return this.refunds.get(id)!
  }
  verifyWebhook() {
    throw new Error(
      'Browser harness reconciles provider truth through API, never bypasses verification',
    )
  }
}
