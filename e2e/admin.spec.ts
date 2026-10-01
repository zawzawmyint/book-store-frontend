import { expect, test, type Page } from '@playwright/test'

// Distinct test clients retain production rate limiting without sharing one proxy bucket.
test.beforeEach(async ({ page }, info) => {
  await page.setExtraHTTPHeaders({ 'X-Real-IP': `192.0.2.${(info.line % 200) + 1}` })
})

async function signIn(page: Page, email = 'admin-e2e@example.com', returnTo = '/admin/books') {
  await page.goto(`/sign-in?returnTo=${encodeURIComponent(returnTo)}`)
  await page.getByLabel('Email address').fill(email)
  await page.getByLabel('Password').fill('bookstore-admin-test-123')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page).toHaveURL(new RegExp(`${returnTo}$`))
  await expect(
    page.getByRole('heading', {
      name: email.startsWith('customer') ? 'Access denied' : 'The Quiet Shelf admin',
    }),
  ).toBeVisible()
}

test('sidebar navigation adapts to mobile and closes after navigation or Escape', async ({
  page,
}) => {
  await signIn(page)
  const navigation = page.getByRole('navigation', { name: 'Admin navigation' })
  const menu = page.getByRole('button', { name: 'Admin menu', exact: true, includeHidden: true })
  const content = page.getByRole('heading', { name: 'Manage books' })
  await expect(navigation).toBeVisible()
  await expect(menu).toBeHidden()
  const navBounds = await navigation.boundingBox()
  const contentBounds = await content.boundingBox()
  expect(navBounds!.x + navBounds!.width).toBeLessThan(contentBounds!.x)
  await expect(navigation.getByRole('link', { name: 'Books', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  )

  await page.setViewportSize({ width: 390, height: 844 })
  await expect(menu).toBeVisible()
  await expect(menu).toHaveAttribute('aria-expanded', 'false')
  await expect(navigation).toBeHidden()
  await menu.focus()
  await page.keyboard.press('Enter')
  await expect(menu).toHaveAttribute('aria-expanded', 'true')
  await expect(page.getByRole('dialog', { name: 'Sidebar' })).toBeVisible()
  await page.screenshot({ path: 'test-results/admin-sidebar-mobile-open.png' })
  await expect(navigation).toBeVisible()
  await navigation.getByRole('link', { name: 'Order requests', exact: true }).click()
  await expect(page).toHaveURL(/\/admin\/orders$/)
  await expect(navigation).toBeHidden()
  await menu.click()
  const ordersLink = navigation.getByRole('link', { name: 'Order requests', exact: true })
  await expect(ordersLink).toHaveAttribute('aria-current', 'page')
  await ordersLink.focus()
  await page.keyboard.press('Escape')
  await expect(navigation).toBeHidden()
  await expect(menu).toBeFocused()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
  await page.screenshot({ path: 'test-results/admin-sidebar-mobile.png', fullPage: true })
  await page.setViewportSize({ width: 1280, height: 900 })
  await expect(navigation).toBeVisible()
  await page.screenshot({ path: 'test-results/admin-sidebar-desktop.png', fullPage: true })
})

test('guests redirect and customers are denied without private requests', async ({ page }) => {
  await page.goto('/admin/orders')
  await expect(page).toHaveURL(/sign-in\?returnTo=/)
  await page.getByLabel('Email address').fill('customer-e2e@example.com')
  await page.getByLabel('Password').fill('bookstore-admin-test-123')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Access denied' })).toBeVisible()
  await expect(page.getByText('legacy-e2e@example.com')).toHaveCount(0)
})

test('admin manages catalog, stock, archive/restore and saved order requests', async ({ page }) => {
  await signIn(page)
  await expect(page.getByRole('heading', { name: 'Manage books' })).toBeVisible()
  await page.getByRole('link', { name: 'Add book', exact: true }).click()
  await page.getByLabel('Title', { exact: true }).fill('Admin journey book')
  await page.getByLabel('Author', { exact: true }).fill('Test Author')
  await page.getByLabel('Genre', { exact: true }).fill('Test Genre')
  await page.getByLabel('Description', { exact: true }).fill('A book created by an administrator.')
  await page.getByLabel('Price (USD)').fill('12.34')
  await page.getByLabel('Initial stock').fill('4')
  await page.getByLabel('Price (USD)').fill('12.345')
  await page.getByRole('button', { name: 'Save book' }).click()
  await expect(page.getByText(/Enter a price from \$0 to \$10,000/)).toBeVisible()
  await page.getByLabel('Price (USD)').fill('12.34')
  await page.getByRole('button', { name: 'Save book' }).click()
  await expect(page.getByText('Admin journey book', { exact: true })).toBeVisible()
  await page.getByLabel('Search books').fill('Admin journey book')
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  let row = page.getByRole('row').filter({ hasText: 'Admin journey book' })
  await row.getByRole('button', { name: 'Adjust stock' }).click()
  await page.keyboard.press('Escape')
  await expect(row.getByRole('button', { name: 'Adjust stock' })).toBeFocused()
  await row.getByRole('button', { name: 'Adjust stock' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toContainText('Current stock: 4')
  await dialog.getByLabel('Quantity change').fill('3')
  await dialog.getByRole('button', { name: 'Apply adjustment' }).click()
  await expect(page.getByText('Stock updated to 7.', { exact: true })).toBeVisible()
  await row.getByRole('link', { name: 'Edit', exact: true }).click()
  await expect(
    page
      .getByRole('navigation', { name: 'Admin navigation' })
      .getByRole('link', { name: 'Books', exact: true }),
  ).toHaveAttribute('aria-current', 'page')
  await expect(page.getByLabel('Initial stock')).toHaveCount(0)
  await page.getByLabel('Title', { exact: true }).fill('Edited journey book')
  await page.getByRole('button', { name: 'Save book' }).click()
  await page.getByLabel('Search books').fill('Edited journey book')
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  row = page.getByRole('row').filter({ hasText: 'Edited journey book' })
  await expect(row).toContainText('$12.34')
  await row.getByRole('button', { name: 'Archive', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Confirm archive' }).click()
  await expect(page.getByText('No matching books.')).toBeVisible()
  await page.getByRole('combobox', { name: 'Catalog state' }).click()
  await page.getByRole('option', { name: 'Archived' }).click()
  await expect(row).toContainText('Archived')
  await row.getByRole('button', { name: 'Restore', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Confirm restore' }).click()
  await page.getByRole('combobox', { name: 'Catalog state' }).click()
  await page.getByRole('option', { name: 'Active' }).click()
  await expect(row).toContainText('Active')
  await page.getByLabel('Low stock only (5 or fewer)').click()
  await expect(page.getByLabel('Low stock only (5 or fewer)')).toBeChecked()
  await expect(page.getByText('No matching books.')).toBeVisible()
  await page.getByLabel('Low stock only (5 or fewer)').click()
  await expect(page.getByLabel('Low stock only (5 or fewer)')).not.toBeChecked()
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: 'test-results/admin-mobile.png', fullPage: true })
  await page.getByRole('button', { name: 'Admin menu', exact: true }).click()
  await page.getByRole('link', { name: 'Order requests', exact: true }).click()
  const legacy = page.getByRole('row').filter({ hasText: 'legacy-e2e@example.com' })
  await legacy.getByRole('link', { name: 'View request' }).click()
  await page.getByRole('button', { name: 'Admin menu', exact: true }).click()
  await expect(
    page
      .getByRole('navigation', { name: 'Admin navigation' })
      .getByRole('link', { name: 'Order requests', exact: true }),
  ).toHaveAttribute('aria-current', 'page')
  await page.getByRole('button', { name: 'Close admin menu', exact: true }).click()
  await expect(page.getByRole('heading', { name: /Order request #/ })).toBeVisible()
  await expect(page.getByText('Legacy guest request', { exact: true })).toBeVisible()
  await expect(page.getByRole('listitem')).toContainText('1 × Legacy saved title')
  await expect(page.getByText('$12.34 each', { exact: true })).toBeVisible()
  await expect(page.getByRole('listitem')).toContainText('$12.34')
  await page.screenshot({ path: 'test-results/admin-order.png', fullPage: true })
})

test('archived books in an existing cart fail checkout while keeping the cart', async ({
  page,
}) => {
  await signIn(page)
  const id = await page.evaluate(async () => {
    const response = await fetch('/graphql', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        query:
          'mutation { createBook(input: { details: { title: "Archive checkout book", author: "Author", genre: "Genre", description: "Description", priceCents: 100 }, stock: 3 }) { id } }',
      }),
    })
    return (await response.json()).data.createBook.id as string
  })
  await page.goto(`/books/${id}`)
  await page.getByRole('button', { name: 'Add to bag', exact: true }).click()
  await page.evaluate(async (bookId) => {
    const response = await fetch('/graphql', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        query: 'mutation ($id: ID!) { setBookArchived(id: $id, archived: true) { id } }',
        variables: { id: bookId },
      }),
    })
    if ((await response.json()).errors) throw new Error('Archive failed')
  }, id)
  await page.goto('/checkout')
  await page.getByRole('button', { name: 'Submit order request' }).click()
  await expect(page.getByRole('alert')).toContainText('unavailable')
  await page.goto('/cart')
  await expect(page.getByRole('link', { name: 'Archive checkout book', exact: true })).toBeVisible()
})

test('revocation blocks the current session and removes private order content', async ({
  page,
  request,
}) => {
  await signIn(page, 'revocable-e2e@example.com', '/admin/orders')
  await expect(page.getByText('legacy-e2e@example.com')).toBeVisible()
  expect((await request.post('http://localhost:4100/__test__/revoke-admin')).ok()).toBe(true)
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await expect(page.getByRole('heading', { name: 'Access denied' })).toBeVisible()
  await expect(page.getByText('legacy-e2e@example.com')).toHaveCount(0)
  await page.getByText('Account', { exact: true }).click()
  await page.getByRole('menuitem', { name: 'Sign out' }).click()
  await signIn(page, 'customer-e2e@example.com', '/admin/orders')
  await expect(page.getByRole('heading', { name: 'Access denied' })).toBeVisible()
  await expect(page.getByText('legacy-e2e@example.com')).toHaveCount(0)
})

test('expired admin sessions return to a usable sign-in form without private content', async ({
  page,
}) => {
  await signIn(page, 'admin-e2e@example.com', '/admin/orders')
  await expect(page.getByText('legacy-e2e@example.com')).toBeVisible()
  await page.context().clearCookies()
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await expect(page).toHaveURL(/\/sign-in\?returnTo=/)
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible()
  await expect(page.getByText('legacy-e2e@example.com')).toHaveCount(0)
})
