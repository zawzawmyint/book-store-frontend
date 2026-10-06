import { createApp } from '../../backend/src/app.js'
import { createDatabase } from '../../backend/src/database/connection.js'
import { seedBooks } from '../../backend/src/database/seed.js'
import { createAuth } from '../../backend/src/auth.js'
import { createAdminRepository } from '../../backend/src/modules/admin/admin.repository.js'
import { operatorActor } from '../../backend/src/modules/activity/activity.types.js'

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
for (let index = 1; index <= 6; index++) {
  db.prepare('INSERT INTO orders (customer_name, email, total_cents) VALUES (?, ?, 0)').run(
    `Pagination Reader ${index}`,
    `pagination-${index}@example.com`,
  )
}
const legacyOrder = db
  .prepare(
    "INSERT INTO orders (customer_name, email, total_cents) VALUES ('Legacy Reader', 'legacy-e2e@example.com', 1234)",
  )
  .run()
db.prepare(
  "INSERT INTO order_items (order_id, book_id, title, quantity, unit_price_cents) VALUES (?, 1, 'Legacy saved title', 1, 1234)",
).run(legacyOrder.lastInsertRowid)
const app = await createApp(db, options)
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
const server = app.listen(4100)
const shutdown = () => server.close(() => db.close())
process.once('SIGINT', shutdown)
process.once('SIGTERM', shutdown)
