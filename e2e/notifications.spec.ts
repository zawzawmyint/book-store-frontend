import { expect, test, type Page } from '@playwright/test'

async function signIn(page: Page, email = 'admin-e2e@example.com') {
  await page.setExtraHTTPHeaders({ 'X-Real-IP': '192.0.2.211' })
  await page.goto('/sign-in?returnTo=%2Faccount%2Fnotifications')
  await page.getByLabel('Email address').fill(email)
  await page.getByLabel('Password').fill('bookstore-admin-test-123')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page).toHaveURL('/account/notifications')
}
async function graphql(page: Page, query: string, variables?: Record<string, unknown>) {
  const response = await page.request.post('/graphql', {
    headers: { Origin: new URL(page.url()).origin },
    data: { query, variables },
  })
  expect(response.ok()).toBe(true)
  const body = await response.json()
  expect(body.errors).toBeUndefined()
  return body.data
}

test('saved notifications work without live transport and preserve account, inbox and recipient isolation', async ({
  page,
  browser,
}) => {
  await page.goto('/books')
  await page.request.post('http://localhost:4100/__test__/restore-admin')
  await expect(page.getByRole('button', { name: /^Notifications,/ })).toHaveCount(0)
  await signIn(page)
  await expect(page.getByText(/Payment confirmed for order #/).first()).toBeVisible()
  await page.getByRole('button', { name: 'Mark all as read', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Notifications, 0 unread' })).toBeVisible()

  await page.goto('/admin/notifications')
  await expect(page.getByText(/New paid order #/).first()).toBeVisible()
  const before = await graphql(page, 'query { notificationUnreadCount(scope: WORKSPACE) }')
  expect(before.notificationUnreadCount).toBeGreaterThan(0)
  const otherContext = await browser.newContext()
  const other = await otherContext.newPage()
  try {
    await page.request.post('http://localhost:4100/__test__/restore-notification-peer')
    await signIn(other, 'revocable-e2e@example.com')
    const otherBefore = await graphql(other, 'query { notificationUnreadCount(scope: WORKSPACE) }')
    await page.getByRole('button', { name: 'Mark all as read', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Notifications, 0 unread' })).toBeVisible()
    expect(
      (await graphql(other, 'query { notificationUnreadCount(scope: WORKSPACE) }'))
        .notificationUnreadCount,
    ).toBe(otherBefore.notificationUnreadCount)
  } finally {
    await otherContext.close()
  }

  const title = `Notification stock ${Date.now()}`
  const created = await graphql(
    page,
    'mutation($title:String!){createBook(input:{details:{title:$title,author:"Reader",genre:"Fiction",description:"Notification journey",priceCents:1000},stock:8}){id}}',
    { title },
  )
  await graphql(page, 'mutation($id:ID!){adjustBookStock(id:$id,delta:-4){id stock}}', {
    id: created.createBook.id,
  })
  // Reload fetches durable history; live is deliberately disabled in this fixture.
  await page.reload()
  const row = page.getByRole('listitem').filter({ hasText: title })
  await expect(row).toContainText('is running low — 4 remaining')
  await expect(page.getByRole('button', { name: 'Notifications, 1 unread' })).toBeVisible()
  await page.screenshot({
    path: 'test-results/notifications-workspace-desktop.png',
    fullPage: true,
  })
  await page.setViewportSize({ width: 375, height: 812 })
  const bell = page.getByRole('button', { name: 'Notifications, 1 unread' })
  await bell.click()
  await expect(page.getByRole('dialog')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: 'test-results/notifications-workspace-mobile.png', fullPage: true })
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(bell).toBeFocused()
  await row.getByRole('link', { name: new RegExp(title) }).click()
  await expect(page).toHaveURL(`/admin/books/${created.createBook.id}/edit`)
  await expect(page.getByRole('button', { name: 'Notifications, 0 unread' })).toBeVisible()
})

test('desktop quick inboxes stay compact, non-modal and navigable in both shells', async ({
  page,
}) => {
  await page.goto('/books')
  await page.request.post('http://localhost:4100/__test__/restore-admin')
  await signIn(page)
  await page.setViewportSize({ width: 1440, height: 1000 })
  for (const theme of ['light', 'dark']) {
    await page.evaluate((value) => localStorage.setItem('book-store-theme', value), theme)
    for (const route of ['/account/notifications', '/admin/notifications']) {
      await page.goto(route)
      const bell = page.getByRole('button', { name: /^Notifications,/ })
      await bell.click()
      const inbox = page.getByRole('dialog', { name: 'Notifications', exact: true })
      await expect(inbox).toBeVisible()
      await expect(inbox.locator('.notification-row-link').first()).toBeVisible()
      await expect(page.locator('[data-slot="dialog-overlay"]')).toHaveCount(0)
      await expect(inbox.getByRole('combobox')).toHaveCount(0)
      await expect(inbox).not.toContainText('Notifications are kept for 90 days.')
      await expect(inbox.locator('.notification-event-icon').first()).toBeVisible()
      await expect.poll(async () => (await inbox.boundingBox())?.width).toBeLessThanOrEqual(400)
      const triggerBox = (await bell.boundingBox())!
      const inboxBox = (await inbox.boundingBox())!
      expect(inboxBox.y).toBeGreaterThanOrEqual(triggerBox.y + triggerBox.height)
      expect(inboxBox.height).toBeLessThan(700)
      await page.screenshot({
        path: `test-results/compact-notifications-${route.startsWith('/admin') ? 'admin' : 'storefront'}-${theme}.png`,
      })
      await page.keyboard.press('Escape')
      await expect(inbox).toHaveCount(0)
      await expect(bell).toBeFocused()
      await bell.click()
      // Outside interaction dismisses without making the surrounding page inert.
      await page.getByRole('heading', { name: 'Notifications', exact: true }).first().click()
      await expect(inbox).toHaveCount(0)
      await bell.click()
      const link = inbox.getByRole('link', { name: /View all notifications/i })
      await expect(link).toHaveAttribute('href', route)
      await link.click()
      await expect(inbox).toHaveCount(0)
    }
  }
})
