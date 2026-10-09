import { expect, test, type Page } from '@playwright/test'

test.beforeEach(async ({ page, request }, info) => {
  await page.setExtraHTTPHeaders({ 'X-Real-IP': `203.0.113.${(info.line % 200) + 1}` })
  expect((await request.post('http://localhost:4100/__test__/seed-demo')).ok()).toBe(true)
})
async function signIn(page: Page, role: 'Admin' | 'Staff' = 'Staff') {
  await page.goto('/sign-in')
  await page.getByRole('button', { name: `Demo ${role}`, exact: true }).click()
  await expect(page).toHaveURL('/admin')
}
test('Staff opens workspace search, navigates by keyboard and preserves filtered order returns', async ({
  page,
}) => {
  await signIn(page)
  await page.getByRole('button', { name: 'Search workspace', exact: true }).click()
  const input = page.getByRole('combobox', { name: 'Search books and orders' })
  await expect(input).toBeFocused()
  await input.fill('Dracula')
  await expect(page.getByRole('option', { name: /Dracula/ })).toBeVisible()
  await input.press('ArrowDown')
  await input.press('Enter')
  await expect(page).toHaveURL(/\/admin\/books\/\d+\/edit$/)
  await page.getByLabel('Title', { exact: true }).fill('Unsaved search draft')
  await page.getByRole('button', { name: 'Search workspace', exact: true }).click()
  await input.press('Escape')
  await expect(page.getByRole('button', { name: 'Search workspace', exact: true })).toBeFocused()
  await expect(page.getByLabel('Title', { exact: true })).toHaveValue('Unsaved search draft')
  await page.getByRole('heading', { name: /Edit book/ }).click()
  await page.keyboard.press('Control+k')
  await input.fill('admin-e2e@')
  await expect(page.getByRole('option', { name: /Test Reader/ }).first()).toBeVisible()
  await page.getByRole('link', { name: /View all matching orders/ }).click()
  await expect(page).toHaveURL(/\/admin\/orders\?search=admin-e2e%40&status=ALL$/)
  await expect(page.getByRole('textbox', { name: 'Search orders' })).toHaveValue('admin-e2e@')
  await page.getByRole('button', { name: 'Next', exact: true }).click()
  await expect(page).toHaveURL(/search=admin-e2e%40.*page=2/)
  await page
    .getByRole('link', { name: /View request/ })
    .first()
    .click()
  await page.getByRole('link', { name: 'Back to order requests' }).click()
  await expect(page).toHaveURL(/search=admin-e2e%40.*page=2/)
  await page.getByRole('button', { name: 'Search workspace', exact: true }).click()
  await input.fill('#2')
  await expect(page.getByRole('option', { name: /Order #2/ })).toBeVisible()
  await expect(page.getByRole('option', { name: /Order #1/ })).toHaveCount(0)
  const bookRequests: string[] = []
  page.on('request', (request) => {
    if (request.postData()?.includes('WorkspaceSearchBooks')) bookRequests.push(request.postData()!)
  })
  await input.fill('2')
  await expect(page.getByRole('option', { name: /Order #2/ })).toBeVisible()
  await expect(page.getByRole('option', { name: /Order #1/ })).toHaveCount(0)
  expect(bookRequests).toEqual([])
  await expect(page.getByText('Enter at least two characters or an order number.')).toHaveCount(0)
  await expect(page.getByRole('status')).toHaveText('1 orders found.')
})

test('search rejects short input, isolates errors and discards old responses after typing or close', async ({
  page,
}) => {
  await signIn(page, 'Admin')
  let count = 0
  page.on('request', (req) => {
    if (req.postData()?.includes('WorkspaceSearch')) count++
  })
  await page.getByRole('button', { name: 'Search workspace', exact: true }).click()
  const input = page.getByRole('combobox', { name: 'Search books and orders' })
  await input.fill('a')
  await page.waitForTimeout(350)
  expect(count).toBe(0)
  const held: (() => void)[] = []
  let failOrders = true
  await page.route('**/graphql', async (route) => {
    const body = route.request().postDataJSON()
    if (body.operationName === 'WorkspaceSearchBooks' && body.variables.search === 'old') {
      await new Promise<void>((resolve) => held.push(resolve))
      await route.fulfill({
        json: {
          data: {
            adminBooks: {
              total: 1,
              items: [{ id: '999', title: 'Old result', author: 'Old', stock: 1 }],
            },
          },
        },
      })
    } else if (
      failOrders &&
      body.operationName === 'WorkspaceSearchOrders' &&
      body.variables.search === 'Dracula'
    ) {
      await route.fulfill({ status: 503, body: 'Service unavailable' })
    } else await route.continue()
  })
  try {
    await input.fill('old')
    await expect.poll(() => held.length).toBe(1)
    await input.fill('Dracula')
    await expect(page.getByRole('option', { name: /Dracula/ })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Retry orders search' })).toBeVisible()
    failOrders = false
    await page.getByRole('button', { name: 'Retry orders search' }).click()
    await expect(page.getByText('No matching orders.', { exact: true })).toBeVisible()
    await expect(page.getByRole('option', { name: /Dracula/ })).toBeVisible()
    held.splice(0).forEach((resolve) => resolve())
    await expect(page.getByRole('option', { name: /Old result/ })).toHaveCount(0)
    await input.fill('old')
    await expect.poll(() => held.length).toBe(1)
    await input.press('Escape')
    held.splice(0).forEach((resolve) => resolve())
    await page.getByRole('button', { name: 'Search workspace', exact: true }).click()
    await expect(input).toHaveValue('')
    await expect(page.getByRole('option')).toHaveCount(0)
  } finally {
    held.forEach((resolve) => resolve())
    await page.unrouteAll({ behavior: 'wait' })
  }
})

test('private search disappears on session loss and Customers cannot mount it', async ({
  page,
}) => {
  await signIn(page)
  await page.getByRole('button', { name: 'Search workspace', exact: true }).click()
  await page.getByRole('combobox').fill('reader')
  await expect(page.getByRole('option', { name: /Test Reader/ }).first()).toBeVisible()
  await page.context().clearCookies()
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await expect(page).toHaveURL(/\/sign-in/)
  await expect(page.getByRole('dialog', { name: 'Search workspace' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Demo Customer', exact: true }).click()
  await expect(page).toHaveURL('/')
  await page.goto('/admin')
  await expect(page.getByRole('heading', { name: 'Access denied' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Search workspace' })).toHaveCount(0)
})

test('search fits mobile and themes, avoids editable/other-modal shortcuts and never mounts in storefront', async ({
  page,
}) => {
  await page.goto('/')
  await page.keyboard.press('Control+k')
  await expect(page.getByRole('dialog', { name: 'Search workspace' })).toHaveCount(0)
  await signIn(page)
  await page.goto('/admin/books/new')
  await page.getByLabel('Title', { exact: true }).fill('Draft')
  await page.getByLabel('Title', { exact: true }).press('Control+k')
  await expect(page.getByRole('dialog', { name: 'Search workspace' })).toHaveCount(0)
  await page.goto('/admin/books')
  await page.getByRole('button', { name: 'Adjust stock', exact: true }).first().click()
  await page.getByRole('button', { name: 'Cancel', exact: true }).focus()
  await page.keyboard.press('Control+k')
  await expect(page.getByRole('dialog', { name: 'Search workspace' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: 'Search workspace', exact: true }).click()
  await page.getByRole('combobox', { name: 'Search books and orders' }).fill('admin-e2e')
  await expect(page.getByRole('option', { name: /Test Reader/ }).first()).toBeVisible()
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
    .toBeLessThanOrEqual(390)
  await page.screenshot({ path: 'test-results/workspace-search-mobile-dark.png', fullPage: true })
  await page.getByRole('combobox').press('Escape')
  await page.getByRole('switch', { name: 'Dark mode' }).click()
  await page.getByRole('button', { name: 'Search workspace', exact: true }).click()
  await page.getByRole('combobox').fill('Dracula')
  await expect(page.getByRole('option', { name: /Dracula/ })).toBeVisible()
  await page.screenshot({ path: 'test-results/workspace-search-mobile-light.png', fullPage: true })
})
