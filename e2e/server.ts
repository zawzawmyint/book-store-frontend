import { BrowserPaymentProvider } from './payment-provider.js'
import { createApp } from '../../backend/src/app.js'
import { createDatabase } from '../../backend/src/database/connection.js'
import { seedBooks } from '../../backend/src/database/seed.js'
import { createAuth } from '../../backend/src/auth.js'
import { createAdminRepository } from '../../backend/src/modules/admin/admin.repository.js'
import { operatorActor } from '../../backend/src/modules/activity/activity.types.js'
import { seedDemoAccounts } from '../../backend/src/database/demo-seed.js'
import { createOrderRepository } from '../../backend/src/modules/orders/order.repository.js'

// Browser tests get a fresh catalog without writing a development database file.
const db = createDatabase(':memory:')
seedBooks(db)
const options = {
  frontendOrigin: 'http://localhost:4173',
  authBaseURL: 'http://localhost:4173',
  authSecret: 'playwright-isolated-auth-secret-32-chars',
  trustedProxyIp: '127.0.0.1',
}
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
  if (!email.startsWith('customer')) membership.setAdminAccess(result.user.id, true, operatorActor)
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
const orderRepository = createOrderRepository(db)
const fixtureCustomer = { id: adminId, name: 'Test Reader', email: 'admin-e2e@example.com' }
for (let index = 1; index <= 6; index++) {
  orderRepository.saveOrder(fixtureCustomer, [{ bookId: '2', quantity: 1 }])
}
// Save a genuine snapshot, then change the catalog metadata without rewriting it.
const snapshotBook = db.prepare('SELECT title, price_cents FROM books WHERE id = 12').get() as {
  title: string
  price_cents: number
}
db.prepare('UPDATE books SET title = ?, price_cents = ? WHERE id = 12').run(
  'Saved request title',
  1234,
)
orderRepository.saveOrder(fixtureCustomer, [{ bookId: '12', quantity: 1 }])
db.prepare('UPDATE books SET title = ?, price_cents = ? WHERE id = 12').run(
  snapshotBook.title,
  snapshotBook.price_cents,
)
const provider = new BrowserPaymentProvider()
const app = await createApp(db, options, { provider })
app.post('/__test__/pay/:id', (req, res) => {
  res.json({ returnUrl: provider.pay(String(req.params.id)) })
})
app.post('/__test__/seed-demo', async (_req, res) => {
  await seedDemoAccounts(db, options, 'test')
  res.json({ ok: true })
})
// Isolated browser harness only; no permission endpoint exists in the product API.
app.post('/__test__/revoke-admin', (_req, res) => {
  membership.setAdminAccess(revocableId, false, operatorActor)
  res.json({ ok: true })
})
// Appearance checks must not inherit the preceding self-demotion journey's role.
app.post('/__test__/restore-admin', (_req, res) => {
  membership.setAdminAccess(adminId, true, operatorActor)
  res.json({ ok: true })
})
const server = app.listen(4100, '127.0.0.1')
const shutdown = () => server.close(() => db.close())
process.once('SIGINT', shutdown)
process.once('SIGTERM', shutdown)
