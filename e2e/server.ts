import { BrowserPaymentProvider } from './payment-provider.js'
import { createApp } from '../../backend/src/app.js'
import { openDatabase } from '../../backend/src/database/runtime.js'
import { seedRuntimeBooks } from '../../backend/src/database/runtime-seed.js'
import { normalizeStore } from '../../backend/src/database/persistence.js'
import { loadConfig } from '../../backend/src/config/env.js'
import { createAuth } from '../../backend/src/auth.js'
import { createAdminRepository } from '../../backend/src/modules/admin/admin.repository.js'
import { operatorActor } from '../../backend/src/modules/activity/activity.types.js'
import { seedDemoAccounts } from '../../backend/src/database/demo-seed.js'
import { createPaymentRepository } from '../../backend/src/modules/payments/payment.repository.js'
import { createPaymentService } from '../../backend/src/modules/payments/payment.service.js'
import { randomUUID } from 'node:crypto'

// Only the isolated browser fixture accepts this override, never product configuration.
const deliveryFeeCents = Number(process.env.E2E_DELIVERY_FEE_CENTS ?? '500')
if (!Number.isInteger(deliveryFeeCents) || deliveryFeeCents < 0 || deliveryFeeCents > 2147483647)
  throw new Error('Invalid isolated browser delivery fee')
const options = {
  frontendOrigin: 'http://localhost:4173',
  authBaseURL: 'http://localhost:4173',
  authSecret: 'playwright-isolated-auth-secret-32-chars',
  trustedProxyIp: '127.0.0.1',
  deliveryEnabled: true,
  deliveryCountryCodes: ['US', 'CA'],
  deliveryFeeCents,
}
// Test provider is explicit; never inherit a development/production database URL.
const providerName = process.env.E2E_DB_PROVIDER ?? 'sqlite'
if (!['sqlite', 'postgresql'].includes(providerName)) throw new Error('Invalid E2E_DB_PROVIDER')
const testUrl = process.env.E2E_DATABASE_URL
if (providerName === 'postgresql') {
  const id = process.env.E2E_DATABASE_RUN_ID ?? ''
  const url = new URL(testUrl ?? 'http://invalid')
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id) ||
    url.hostname !== '127.0.0.1' ||
    url.pathname !== `/book_store_e2e_${id.replaceAll('-', '')}`
  )
    throw new Error(
      'PostgreSQL browser tests require the disposable local database owned by test:postgres:browser',
    )
}
const database = await openDatabase(
  loadConfig({
    NODE_ENV: 'test',
    DB_PROVIDER: providerName,
    DATABASE_PATH: ':memory:',
    DATABASE_URL: providerName === 'postgresql' ? testUrl : undefined,
    PG_TLS_MODE: 'disable',
    BETTER_AUTH_SECRET: options.authSecret,
    FRONTEND_ORIGIN: options.frontendOrigin,
    BETTER_AUTH_URL: options.authBaseURL,
  }),
)
const db = database.handle
await seedRuntimeBooks(db)
const store = normalizeStore(db)
const auth = createAuth(db, options)
const membership = createAdminRepository(db)
let revocableId = ''
let adminId = ''
for (const email of [
  'admin-e2e@example.com',
  'revocable-e2e@example.com',
  'customer-e2e@example.com',
]) {
  const result = await auth.api.signUpEmail({
    body: { name: 'Test Reader', email, password: 'bookstore-admin-test-123' },
  })
  if (!email.startsWith('customer'))
    await membership.setAdminAccess(result.user.id, true, operatorActor)
  if (email.startsWith('revocable')) revocableId = result.user.id
  if (email.startsWith('admin')) adminId = result.user.id
}
for (let index = 1; index <= 3; index += 1) {
  await auth.api.signUpEmail({
    body: {
      name: `Directory Reader ${index}`,
      email: `directory-${index}@example.com`,
      password: 'bookstore-admin-test-123',
    },
  })
}
const provider = new BrowserPaymentProvider()
const paymentService = createPaymentService(createPaymentRepository(db, Date.now), {
  ...options,
  provider,
})
const fixtureAddress = {
  recipientName: 'Test Reader',
  phone: '+1 202 555 0123',
  addressLine1: '123 Reading Lane',
  city: 'Boston',
  countryCode: 'US',
}
async function fixtureOrder(bookId: string) {
  const items = [{ bookId, quantity: 1 }]
  const quote = await paymentService.quoteCheckout({ items, deliveryAddress: fixtureAddress })
  const checkout = await paymentService.createCheckout(
    {
      requestKey: randomUUID(),
      items,
      deliveryAddress: fixtureAddress,
      expectedDeliveryFeeCents: quote.deliveryFeeCents,
      expectedTotalCents: quote.totalCents,
    },
    fixtureCustomer,
  )
  provider.pay(checkout.order.id)
  await paymentService.refreshOrderPayment(checkout.order.id, fixtureCustomer)
}
const fixtureCustomer = { id: adminId, name: 'Test Reader', email: 'admin-e2e@example.com' }
for (let index = 1; index <= 6; index++) {
  await fixtureOrder('2')
}
// Save a genuine snapshot, then change the catalog metadata without rewriting it.
const snapshotBook = (await store.book(12))!
await store.updateBook(12, { title: 'Saved request title', priceCents: 1234 })
await fixtureOrder('12')
await store.updateBook(12, { title: snapshotBook.title, priceCents: snapshotBook.priceCents })
const app = await createApp(db, options, { ...options, provider })
app.post('/__test__/pay/:id', (req, res) => {
  res.json({ returnUrl: provider.pay(String(req.params.id)) })
})
app.post('/__test__/seed-demo', async (_req, res) => {
  await seedDemoAccounts(db, options, 'test')
  res.json({ ok: true })
})
// Isolated browser harness only; no permission endpoint exists in the product API.
app.post('/__test__/revoke-admin', async (_req, res) => {
  await membership.setAdminAccess(revocableId, false, operatorActor)
  res.json({ ok: true })
})
// Appearance checks must not inherit the preceding self-demotion journey's role.
app.post('/__test__/restore-admin', async (_req, res) => {
  await membership.setAdminAccess(adminId, true, operatorActor)
  res.json({ ok: true })
})
const server = app.listen(4100, '127.0.0.1')
const shutdown = () =>
  server.close(() => {
    void (async () => {
      try {
        await app.locals.close()
      } finally {
        await database.close()
      }
    })()
  })
process.once('SIGINT', shutdown)
process.once('SIGTERM', shutdown)
