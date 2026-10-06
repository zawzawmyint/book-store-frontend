import { expect, test, type Page } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.setExtraHTTPHeaders({ 'X-Real-IP': '192.0.2.245' })
})

async function signIn(page: Page, email: string, path: string) {
  await page.goto(`/sign-in?returnTo=${encodeURIComponent(path)}`)
  await page.getByLabel('Email address').fill(email)
  await page.getByLabel('Password').fill('bookstore-admin-test-123')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page).toHaveURL(path)
}

async function graphql(page: Page, query: string, variables: Record<string, unknown> = {}) {
  const response = await page.request.post('/graphql', {
    headers: { Origin: 'http://localhost:4173' },
    data: { query, variables },
  })
  const result = await response.json()
  expect(result.errors).toBeUndefined()
  return result.data
}

test('admin opens activity and book history while customer URLs are denied', async ({
  page,
  browser,
}) => {
  await signIn(page, 'admin-e2e@example.com', '/admin/activity')
  await expect(page.getByRole('heading', { name: 'Activity', exact: true })).toBeVisible()
  await page.goto('/admin/books/1/history')
  await expect(page.getByText('No activity recorded yet', { exact: true })).toBeVisible()
  const customer = await browser.newContext({ extraHTTPHeaders: { 'X-Real-IP': '192.0.2.246' } })
  try {
    const customerPage = await customer.newPage()
    const historyRequests: string[] = []
    customerPage.on('request', (request) => {
      if (request.url().endsWith('/graphql') && request.postData()?.includes('AdminActivity'))
        historyRequests.push(request.postData()!)
    })
    await signIn(customerPage, 'customer-e2e@example.com', '/admin/activity')
    await expect(customerPage.getByText('Access denied', { exact: true })).toBeVisible()
    await customerPage.goto('/admin/books/1/history')
    await expect(customerPage.getByText('Access denied', { exact: true })).toBeVisible()
    expect(historyRequests).toHaveLength(0)
  } finally {
    await customer.close()
  }
})

test('staff changes appear once in admin activity and book history with safe details', async ({
  page,
  browser,
}) => {
  await signIn(page, 'admin-e2e@example.com', '/admin/users')
  const data = await graphql(
    page,
    '{ adminBook(id: "1") { title author genre description priceCents stock } adminUsers(search: "directory-3@example.com") { items { id } } }',
  )
  const original = data.adminBook
  const staffId = data.adminUsers.items[0].id
  await page.getByLabel('Search users').fill('directory-3@example.com')
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  const userRow = page.getByRole('row').filter({ hasText: 'directory-3@example.com' })
  await userRow.getByRole('button', { name: 'Change role' }).click()
  await page.getByLabel('New role').selectOption('STAFF')
  await page.getByRole('button', { name: 'Confirm role change' }).click()
  await expect(
    page.getByText('Directory Reader 3 is now a staff member.', { exact: true }),
  ).toBeVisible()
  const context = await browser.newContext({ extraHTTPHeaders: { 'X-Real-IP': '192.0.2.247' } })
  const staff = await context.newPage()
  try {
    await signIn(staff, 'directory-3@example.com', '/admin/books')
    await expect(staff.getByRole('link', { name: 'Activity', exact: true })).toHaveCount(0)
    await expect(staff.getByRole('link', { name: /^History for / })).toHaveCount(0)
    const deniedRequests: string[] = []
    staff.on('request', (request) => {
      if (request.url().endsWith('/graphql') && request.postData()?.includes('AdminActivity'))
        deniedRequests.push(request.postData()!)
    })
    await staff.goto('/admin/activity')
    await expect(staff.getByText('Access denied', { exact: true })).toBeVisible()
    await staff.goto('/admin/books/1/history')
    await expect(staff.getByText('Access denied', { exact: true })).toBeVisible()
    expect(deniedRequests).toHaveLength(0)
    await staff.goto('/admin/books/1/edit')
    await staff
      .getByLabel('Description', { exact: true })
      .fill('Activity detail <em>must remain text</em>')
    await staff.getByLabel('Price (USD)').fill(((original.priceCents + 500) / 100).toFixed(2))
    await staff.getByRole('button', { name: 'Save book' }).click()
    await expect(staff).toHaveURL('/admin/books')
    await staff.getByLabel('Search books').fill(original.title)
    await staff.getByRole('button', { name: 'Search', exact: true }).click()
    const bookRow = staff.getByRole('row').filter({ hasText: original.title })
    await bookRow.getByRole('button', { name: 'Adjust stock' }).click()
    await staff.getByLabel('Quantity change').fill('2')
    await staff.getByRole('button', { name: 'Apply adjustment' }).click()
    await expect(
      staff.getByText(`Stock updated to ${original.stock + 2}.`, { exact: true }),
    ).toBeVisible()
    await page.goto('/admin/activity')
    await page.getByLabel('Actor user ID').fill(staffId)
    await page.getByLabel('Price changes only').check()
    await page.getByRole('button', { name: 'Apply filters' }).click()
    await expect(page).toHaveURL(/changedField=PRICE_CENTS/)
    const events = page.getByRole('table', { name: 'activity events' }).locator('tbody tr')
    await expect(events).toHaveCount(1)
    await expect(events.first()).toContainText('Directory Reader 3')
    await expect(events.first()).toContainText('Staff')
    await events.first().getByText('View changes', { exact: true }).click()
    await expect(
      page.getByText('New: Activity detail <em>must remain text</em>', { exact: true }),
    ).toBeVisible()
    await expect(page.locator('em')).toHaveCount(0)
    await page.reload()
    await expect(events).toHaveCount(1)
    await page.goto('/admin/books?search=' + encodeURIComponent(original.title))
    const historyLink = page
      .getByRole('row')
      .filter({ hasText: original.title })
      .getByRole('link', { name: /^History for / })
    await historyLink.click()
    await expect(page.getByRole('heading', { name: 'Book history', exact: true })).toBeVisible()
    await expect(
      page.getByRole('table', { name: 'activity events' }).locator('tbody tr'),
    ).toHaveCount(2)
    await page.getByRole('link', { name: 'Back to books', exact: true }).click()
    await expect(page).toHaveURL(/\/admin\/books\?/)
    expect(new URL(page.url()).searchParams.get('search')).toBe(original.title)
    await page.goto('/admin/activity')
    await page.setViewportSize({ width: 390, height: 844 })
    await page.getByRole('button', { name: 'Admin menu', exact: true }).click()
    await page
      .getByRole('navigation', { name: 'Admin navigation' })
      .getByRole('link', { name: 'Activity', exact: true })
      .click()
    await expect(page.getByRole('navigation', { name: 'Admin navigation' })).toBeHidden()
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true)
    await page.screenshot({ path: 'test-results/activity-mobile.png', fullPage: true })
  } finally {
    const { stock: _stock, ...details } = original
    await graphql(
      page,
      'mutation($details: AdminBookDetailsInput!) { updateBook(id: "1", input: $details) { id } }',
      { details },
    )
    const current = await graphql(page, '{ adminBook(id: "1") { stock } }')
    if (current.adminBook.stock !== original.stock)
      await graphql(
        page,
        'mutation($delta: Int!) { adjustBookStock(id: "1", delta: $delta) { stock } }',
        { delta: original.stock - current.adminBook.stock },
      )
    await graphql(
      page,
      'mutation($id: ID!) { setUserRole(userId: $id, role: CUSTOMER) { role } }',
      { id: staffId },
    )
    await context.close()
  }
})

test('revocation removes private activity from an active admin session', async ({
  page,
  browser,
}) => {
  await signIn(page, 'admin-e2e@example.com', '/admin/activity')
  const users = await graphql(
    page,
    '{ adminUsers(search: "revocable-e2e@example.com") { items { id } } }',
  )
  const revocableId = users.adminUsers.items[0].id
  const context = await browser.newContext({ extraHTTPHeaders: { 'X-Real-IP': '192.0.2.248' } })
  try {
    const viewer = await context.newPage()
    await signIn(viewer, 'revocable-e2e@example.com', '/admin/activity')
    await expect(viewer.getByRole('table', { name: 'activity events' })).toBeVisible()
    expect((await viewer.request.post('http://localhost:4100/__test__/revoke-admin')).ok()).toBe(
      true,
    )
    await viewer.reload()
    await expect(viewer.getByText('Access denied', { exact: true })).toBeVisible()
    await expect(viewer.getByRole('table', { name: 'activity events' })).toHaveCount(0)
  } finally {
    await graphql(page, 'mutation($id: ID!) { setUserRole(userId: $id, role: ADMIN) { role } }', {
      id: revocableId,
    })
    await context.close()
  }
})
