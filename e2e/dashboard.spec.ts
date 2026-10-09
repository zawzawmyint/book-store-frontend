import { expect, test, type Page } from '@playwright/test'

test.beforeEach(async ({ page, request }, info) => {
  await page.setExtraHTTPHeaders({ 'X-Real-IP': `198.51.100.${(info.line % 200) + 1}` })
  expect((await request.post('http://localhost:4100/__test__/seed-demo')).ok()).toBe(true)
})
async function signIn(page: Page, role: 'Admin' | 'Staff' | 'Customer') {
  await page.goto('/sign-in')
  await page.getByRole('button', { name: `Demo ${role}`, exact: true }).click()
  await expect(page).toHaveURL(role === 'Customer' ? '/' : '/admin')
}

test('dashboard status links work on the first click during a focus refresh', async ({ page }) => {
  await signIn(page, 'Staff')
  const link = page.getByRole('link', { name: 'All orders in this status', exact: true }).first()
  await expect(link).toBeVisible()
  const before = await link.boundingBox()
  expect(before).not.toBeNull()
  let release!: () => void
  const held = new Promise<void>((resolve) => {
    release = resolve
  })
  await page.route('**/graphql', async (route) => {
    if (route.request().postData()?.includes('WorkspaceDashboard')) await held
    await route.continue()
  })
  try {
    const request = page.waitForRequest(
      (req) => req.url().includes('/graphql') && !!req.postData()?.includes('WorkspaceDashboard'),
    )
    await page.evaluate(() => window.dispatchEvent(new Event('focus')))
    await request
    await expect(page.getByRole('status').filter({ hasText: 'Refreshing…' })).toHaveCount(1)
    expect((await link.boundingBox())?.y).toBe(before!.y)
    await page.mouse.click(before!.x + before!.width / 2, before!.y + before!.height / 2)
    await expect(page).toHaveURL('/admin/orders?status=SUBMITTED')
  } finally {
    release()
    await page.unrouteAll({ behavior: 'wait' })
  }
})
test('Admin dashboard exposes recorded payments, period selection and safe drill-down return', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await signIn(page, 'Admin')
  await expect(page).toHaveURL('/admin')
  await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Recorded payments', exact: true })).toBeVisible()
  for (const chart of [
    'Current paid orders by fulfillment status',
    'Daily captured payments and successful refunds',
  ]) {
    await expect
      .poll(() =>
        page.getByLabel(chart, { exact: true }).evaluate((el) => el.getBoundingClientRect().bottom),
      )
      .toBeLessThanOrEqual(900)
  }
  const fulfillment = page.getByRole('region', { name: 'Current fulfillment' })
  await fulfillment.locator('.recharts-rectangle').first().hover()
  const tooltip = fulfillment.locator('.recharts-tooltip-wrapper > div')
  await expect(tooltip).toBeVisible()
  const background = await tooltip.evaluate((el) => getComputedStyle(el).backgroundColor)
  expect(background).not.toBe('rgba(0, 0, 0, 0)')
  await page.getByRole('heading', { name: 'Dashboard', exact: true }).hover()
  await page.getByLabel('Payment period').selectOption('7')
  await expect(page).toHaveURL('/admin?period=7')
  await page.getByLabel('Payment period').focus()
  await page.keyboard.press('End')
  await expect(page).toHaveURL('/admin?period=90')
  await page.getByLabel('Payment period').focus()
  await page.keyboard.press('Home')
  await expect(page).toHaveURL('/admin?period=7')
  await page.getByText('View daily values', { exact: true }).click()
  await expect(
    page.getByRole('table', { name: 'Daily recorded payments' }).locator('tbody tr'),
  ).toHaveCount(7)
  const recent = page.getByRole('region', { name: 'Recent orders' })
  await recent
    .getByRole('link', { name: /View order/ })
    .first()
    .click()
  await page.getByRole('link', { name: 'Back to dashboard', exact: true }).click()
  await expect(page).toHaveURL('/admin?period=7')
  await page.getByRole('button', { name: 'Refresh dashboard', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Current fulfillment' })).toBeVisible()
  await page.setViewportSize({ width: 390, height: 844 })
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
    .toBeLessThanOrEqual(390)
  await page.screenshot({ path: 'test-results/dashboard-mobile.png', fullPage: true })
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.screenshot({ path: 'test-results/dashboard-desktop.png', fullPage: true })
  const theme = page.getByRole('switch', { name: 'Dark mode', exact: true })
  await theme.focus()
  await page.keyboard.press('Space')
  await expect(theme).toHaveAttribute('aria-checked', 'false')
  await expect(theme).toBeFocused()
  await page.screenshot({ path: 'test-results/dashboard-light.png', fullPage: true })
})
test('Staff dashboard never requests financial aggregates and supports stock adjustment', async ({
  page,
}) => {
  const financeRequests: string[] = []
  page.on('request', (req) => {
    if (req.url().includes('/graphql') && req.postData()?.includes('DashboardFinance'))
      financeRequests.push(req.postData()!)
  })
  await signIn(page, 'Staff')
  const gql = async (query: string) => {
    const result = await page.request.post('/graphql', {
      data: { query },
      headers: { Origin: 'http://localhost:4173' },
    })
    const body = await result.json()
    expect(body.errors).toBeUndefined()
    return body.data
  }
  const book = (await gql('{ adminBook(id: "1") { title stock } }')).adminBook
  const originalStock = book.stock
  if (originalStock !== 1)
    await gql(`mutation { adjustBookStock(id: "1", delta: ${1 - originalStock}) { stock } }`)
  await page.getByRole('button', { name: 'Refresh dashboard' }).click()
  await expect(page).toHaveURL('/admin')
  await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Recorded payments', exact: true })).toHaveCount(0)
  const alerts = page.getByRole('region', { name: 'Stock alerts' })
  const row = alerts.locator('li').filter({ has: page.getByText(book.title, { exact: true }) })
  const before = Number(await row.getByTestId('stock-count').textContent())
  await row.getByRole('button', { name: 'Adjust stock', exact: true }).click()
  await page.getByLabel('Quantity change').fill('1')
  await page.getByRole('button', { name: 'Apply adjustment', exact: true }).click()
  await expect(
    page.getByRole('status').filter({ hasText: `Stock updated to ${before + 1}` }),
  ).toBeVisible()
  await expect(row.getByTestId('stock-count')).toHaveText(String(before + 1))
  if (originalStock !== 2)
    await gql(`mutation { adjustBookStock(id: "1", delta: ${originalStock - 2}) { stock } }`)
  expect(financeRequests).toEqual([])
})
test('guest and Customer cannot enter dashboard', async ({ page }) => {
  await page.goto('/admin')
  await expect(page).toHaveURL(/\/sign-in\?returnTo=/)
  await signIn(page, 'Customer')
  await page.goto('/admin')
  await expect(page.getByRole('heading', { name: 'Access denied', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toHaveCount(0)
})

test('dashboard removes financial data when Admin access is revoked', async ({ page, browser }) => {
  const controllerContext = await browser.newContext({
    extraHTTPHeaders: { 'X-Real-IP': '198.51.100.249' },
  })
  const controller = await controllerContext.newPage()
  await signIn(controller, 'Admin')
  const gql = async (query: string) => {
    const response = await controller.request.post('/graphql', {
      data: { query },
      headers: { Origin: 'http://localhost:4173' },
    })
    const body = await response.json()
    expect(body.errors).toBeUndefined()
    return body.data
  }
  const target = (
    await gql('{ adminUsers(search: "revocable-e2e@example.com") { items { id role } } }')
  ).adminUsers.items[0]
  await gql(`mutation { setUserRole(userId: "${target.id}", role: ADMIN) { role } }`)
  try {
    await page.goto('/sign-in?returnTo=%2Fadmin')
    await page.getByLabel('Email address').fill('revocable-e2e@example.com')
    await page.getByLabel('Password').fill('bookstore-admin-test-123')
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()
    await expect(
      page.getByRole('heading', { name: 'Recorded payments', exact: true }),
    ).toBeVisible()
    expect((await page.request.post('http://localhost:4100/__test__/revoke-admin')).ok()).toBe(true)
    await page.evaluate(() => window.dispatchEvent(new Event('focus')))
    await expect(page.getByRole('heading', { name: 'Access denied', exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Recorded payments', exact: true })).toHaveCount(
      0,
    )
  } finally {
    await gql(`mutation { setUserRole(userId: "${target.id}", role: ${target.role}) { role } }`)
    await controllerContext.close()
  }
})
