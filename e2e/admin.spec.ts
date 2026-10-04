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

test('admin workspace stays separate from shopping and returns to the storefront', async ({
  page,
}) => {
  await signIn(page)
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toHaveCount(0)
  await expect(page.getByText('A little bookstore for big imaginations')).toHaveCount(0)
  await expect(page.getByRole('contentinfo')).toHaveCount(0)
  await page.getByRole('link', { name: 'Back to store', exact: true }).click()
  await expect(page).toHaveURL('/')
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible()
  await page.getByRole('button', { name: 'Account', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Admin', exact: true }).click()
  await expect(page).toHaveURL('/admin/books')
  await page.getByRole('button', { name: 'Account', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Sign out', exact: true }).click()
  await expect(page).toHaveURL('/')
  await expect(page.getByRole('link', { name: 'Sign in', exact: true })).toBeVisible()
})

test('admin filter toolbar aligns controls and wraps on mobile', async ({ page }) => {
  await signIn(page)
  const search = page.getByLabel('Search books')
  const submit = page.getByRole('button', { name: 'Search', exact: true })
  const catalog = page.getByRole('combobox', { name: 'Catalog state' })
  const toggle = page.getByRole('checkbox', { name: 'Low stock only (5 or fewer)' })
  const boxes = await Promise.all(
    [search, submit, catalog, toggle].map((control) => control.boundingBox()),
  )
  const [inputBox, buttonBox, selectBox, toggleBox] = boxes.map((box) => {
    expect(box).not.toBeNull()
    return box!
  })
  for (const box of [buttonBox, selectBox]) {
    expect(Math.abs(box.y - inputBox.y)).toBeLessThanOrEqual(1)
    expect(Math.abs(box.height - inputBox.height)).toBeLessThanOrEqual(1)
  }
  expect(
    Math.abs(toggleBox.y + toggleBox.height / 2 - inputBox.y - inputBox.height / 2),
  ).toBeLessThanOrEqual(1)
  await search.fill('Gatsby')
  await search.press('Enter')
  await expect(page.getByRole('table').locator('tbody tr')).toHaveCount(1)
  await page.screenshot({ path: 'test-results/admin-toolbar-desktop.png', fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  for (const control of [search, submit, catalog, toggle]) {
    await expect(control).toBeVisible()
    const box = await control.boundingBox()
    expect(box!.x).toBeGreaterThanOrEqual(0)
    expect(box!.x + box!.width).toBeLessThanOrEqual(390)
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
  await page.screenshot({ path: 'test-results/admin-toolbar-mobile.png', fullPage: true })
})

test('admin lists paginate in five-item pages without losing filters', async ({ page }) => {
  await signIn(page)
  const rows = page.getByRole('table').locator('tbody tr')
  await expect(rows).toHaveCount(5)
  await expect(page.getByText('Showing 1–5 of 12 books', { exact: true })).toBeVisible()
  const thumbnail = rows.first().locator('[data-slot="book-cover-thumbnail"]')
  await expect(thumbnail).toBeVisible()
  await expect(thumbnail).toHaveAttribute('aria-hidden', 'true')
  await expect(page.getByText('Page 1 of 3', { exact: true })).toBeVisible()
  const firstTitle = await rows.first().locator('strong').innerText()
  await page.getByRole('button', { name: 'Next', exact: true }).click()
  await expect(page).toHaveURL(/page=2/)
  await expect(page.getByText('Showing 6–10 of 12 books', { exact: true })).toBeVisible()
  await expect(rows).toHaveCount(5)
  await expect(rows.first()).not.toContainText(firstTitle)
  await page.getByRole('button', { name: 'Next', exact: true }).click()
  await expect(rows).toHaveCount(2)
  await expect(page.getByText('Showing 11–12 of 12 books', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: 'Previous', exact: true }).click()
  await expect(rows).toHaveCount(5)
  await page.getByLabel('Search books').fill('Gatsby')
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  await expect(page).not.toHaveURL(/page=/)
  await expect(rows).toHaveCount(1)
  await expect(page.getByText('Page 1 of 1', { exact: true })).toBeVisible()
  await page
    .getByRole('navigation', { name: 'Admin navigation' })
    .getByRole('link', { name: 'Order requests', exact: true })
    .click()
  await expect(rows).toHaveCount(5)
  await expect(page.getByText('Page 1 of 2', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Next', exact: true }).click()
  await expect(rows).toHaveCount(2)
  await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeDisabled()
  await rows.first().getByRole('link', { name: 'View request' }).click()
  await page.getByRole('link', { name: 'Back to order requests', exact: true }).click()
  await expect(page).toHaveURL(/orders\?page=2$/)
  await expect(rows).toHaveCount(2)
})

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
  await page.screenshot({ path: 'test-results/admin-books-desktop.png', fullPage: true })
  await page.getByRole('link', { name: 'Add book', exact: true }).click()
  await page.getByLabel('Title', { exact: true }).fill('Admin journey book')
  await page.getByLabel('Author', { exact: true }).fill('Test Author')
  await page.getByLabel('Genre', { exact: true }).fill('Test Genre')
  await page.getByLabel('Description', { exact: true }).fill('A book created by an administrator.')
  await page.getByLabel('Price (USD)').fill('12.34')
  await page.getByLabel('Initial stock').fill('4')
  await page.screenshot({ path: 'test-results/admin-book-form-desktop.png', fullPage: true })
  await page.getByLabel('Price (USD)').fill('12.345')
  await page.getByRole('button', { name: 'Save book' }).click()
  await expect(page.getByText(/Enter a price from \$0 to \$10,000/)).toBeVisible()
  await page.getByLabel('Price (USD)').fill('12.34')
  await page.getByRole('button', { name: 'Save book' }).click()
  await expect(page.getByText('Book created.', { exact: true })).toBeVisible()
  await page.getByLabel('Search books').fill('Admin journey book')
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  let row = page.getByRole('row').filter({ hasText: 'Admin journey book' })
  await row.getByRole('button', { name: 'Adjust stock' }).click()
  await page.keyboard.press('Escape')
  await expect(row.getByRole('button', { name: 'Adjust stock' })).toBeFocused()
  await row.getByRole('button', { name: 'Adjust stock' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toContainText('Current stock: 4')
  await page.screenshot({ path: 'test-results/admin-stock-dialog.png' })
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
  const moreActions = row.getByRole('button', {
    name: 'More actions for Edited journey book',
    exact: true,
  })
  await moreActions.focus()
  await page.keyboard.press('Enter')
  await page.getByRole('menuitem', { name: 'Archive', exact: true }).click()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(moreActions).toBeFocused()
  await moreActions.click()
  await page.getByRole('menuitem', { name: 'Archive', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Confirm archive' }).click()
  await expect(page.getByText('No matching books.')).toBeVisible()
  await expect(page.getByText('Showing 0–0 of 0 books', { exact: true })).toBeVisible()
  await page.getByRole('combobox', { name: 'Catalog state' }).click()
  await page.getByRole('option', { name: 'Archived' }).click()
  await expect(row).toContainText('Archived')
  await row
    .getByRole('button', { name: 'More actions for Edited journey book', exact: true })
    .click()
  await page.getByRole('menuitem', { name: 'Restore', exact: true }).click()
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

test('admin lists customers and grants or revokes admin access', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await signIn(page, 'admin-e2e@example.com', '/admin/customers')
  const navigation = page.getByRole('navigation', { name: 'Admin navigation' })
  const customers = navigation.getByRole('link', { name: 'Customers', exact: true })
  await expect(customers).toHaveAttribute('aria-current', 'page')
  await expect(page.getByRole('heading', { name: 'Customers', exact: true })).toBeVisible()
  const rows = page.getByRole('table').locator('tbody tr')
  await expect(rows).toHaveCount(5)
  await expect(page.getByText('Showing 1–5 of 6 customers', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Next', exact: true }).click()
  await expect(page).toHaveURL(/page=2/)
  await expect(rows).toHaveCount(1)
  await expect(page.getByText('Showing 6–6 of 6 customers', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeDisabled()
  await page.getByLabel('Search customers').fill('customer-e2e@example.com')
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  await expect(page).not.toHaveURL(/page=/)
  await expect(rows).toHaveCount(1)
  const customer = rows.first()
  await customer.getByRole('button', { name: 'Copy user ID' }).click()
  await expect(page.getByText('User ID copied.', { exact: true })).toBeVisible()
  const copied = await page.evaluate(() => navigator.clipboard.readText())
  await expect(customer).toContainText(copied)
  await customer.getByRole('button', { name: 'Grant admin' }).click()
  await page.keyboard.press('Escape')
  await expect(customer.getByRole('button', { name: 'Grant admin' })).toBeFocused()
  await customer.getByRole('button', { name: 'Grant admin' }).click()
  await expect(page.getByText(/open the admin workspace/)).toBeVisible()
  await page.getByRole('button', { name: 'Confirm grant' }).click()
  await expect(page.getByText('Test Reader is now an admin.', { exact: true })).toBeVisible()
  await expect(customer.getByRole('button', { name: 'Revoke admin' })).toBeVisible()
  await customer.getByRole('button', { name: 'Revoke admin' }).click()
  await page.getByRole('button', { name: 'Confirm revoke' }).click()
  await expect(page.getByText('Test Reader is now a customer.', { exact: true })).toBeVisible()
  await page.getByLabel('Search customers').fill('')
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  await page.getByRole('combobox', { name: 'Role' }).click()
  await page.getByRole('option', { name: 'Admins', exact: true }).click()
  await expect(page).toHaveURL(/role=ADMIN/)
  await expect(page.getByText('customer-e2e@example.com')).toHaveCount(0)
  await expect(page.getByText('admin-e2e@example.com')).toBeVisible()
  await page.screenshot({ path: 'test-results/admin-customers-desktop.png', fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  const menu = page.getByRole('button', { name: 'Admin menu', exact: true })
  await menu.click()
  await navigation.getByRole('link', { name: 'Customers', exact: true }).click()
  await expect(page).toHaveURL(/\/admin\/customers$/)
  await expect(navigation).toBeHidden()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
  await page.screenshot({ path: 'test-results/admin-customers-mobile.png', fullPage: true })
})

test('guests and customers cannot open the customer directory', async ({ page }) => {
  await page.goto('/admin/customers/some-customer')
  await expect(page).toHaveURL(/sign-in\?returnTo=.*admin%2Fcustomers%2Fsome-customer/)
  await page.goto('/admin/customers')
  await expect(page).toHaveURL(/sign-in\?returnTo=.*admin%2Fcustomers/)
  await page.getByLabel('Email address').fill('customer-e2e@example.com')
  await page.getByLabel('Password').fill('bookstore-admin-test-123')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Access denied' })).toBeVisible()
  await expect(page.getByText('directory-1@example.com')).toHaveCount(0)
  await expect(page.getByText('customer-e2e@example.com')).toHaveCount(0)
  await page.goto('/admin/customers/some-customer')
  await expect(page.getByRole('heading', { name: 'Access denied' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Set password' })).toHaveCount(0)
  await expect(page.getByLabel('New password')).toHaveCount(0)
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

test('admin account menu opens the admin profile', async ({ page }) => {
  await signIn(page, 'admin-e2e@example.com', '/admin/books')
  await page.getByRole('button', { name: 'Account', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Profile', exact: true }).click()
  await expect(page).toHaveURL('/admin/profile')
  await expect(page.getByRole('heading', { name: 'The Quiet Shelf admin' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Your profile' })).toBeVisible()
  await expect(page.getByText('admin-e2e@example.com')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Back to store', exact: true })).toBeVisible()
  await page.goto('/admin/customers')
  await expect(page.getByRole('button', { name: 'Edit profile' })).toHaveCount(0)
})

test('admin opens a customer and sets a password that customer can use', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await signIn(page, 'admin-e2e@example.com', '/admin/customers')
  await page.getByLabel('Search customers').fill('admin-e2e@example.com')
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  const adminRow = page.getByRole('row', { name: /admin-e2e@example.com/ })
  await adminRow.getByRole('link', { name: 'View customer', exact: true }).click()
  await expect(page).toHaveURL(/\/admin\/customers\/.+/)
  const navigation = page.getByRole('navigation', { name: 'Admin navigation' })
  await expect(navigation.getByRole('link', { name: 'Customers', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  )
  await expect(page.getByRole('heading', { name: 'Test Reader', exact: true })).toBeVisible()
  await expect(page.getByLabel('New password')).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'your profile' })).toHaveAttribute('href', '/admin/profile')
  await page.getByRole('button', { name: 'Copy user ID' }).click()
  await expect(page.getByText('User ID copied.', { exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'Back to customers' }).click()
  await expect(page).toHaveURL(/search=admin-e2e%40example.com|search=admin-e2e@example.com/)
  await page.getByLabel('Search customers').fill('directory-1@example.com')
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  const directoryRow = page.getByRole('row', { name: /directory-1@example.com/ })
  await directoryRow.getByRole('link', { name: 'View customer', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Directory Reader 1', exact: true })).toBeVisible()
  await expect(page.getByText('directory-1@example.com')).toBeVisible()
  await expect(page.getByText('Customer', { exact: true })).toBeVisible()
  await page.getByLabel('New password', { exact: true }).fill('short')
  await page.getByLabel('Confirm new password').fill('other-password')
  await page.getByRole('button', { name: 'Set password', exact: true }).click()
  await expect(page.getByText('Use at least 8 characters.')).toBeVisible()
  await page.getByLabel('New password', { exact: true }).fill('bookstore-reset-password-123')
  await page.getByLabel('Confirm new password').fill('bookstore-reset-password-123')
  await page.getByRole('button', { name: 'Set password', exact: true }).click()
  await expect(page.getByText('Password set.', { exact: true })).toBeVisible()
  await expect(page.getByLabel('New password', { exact: true })).toHaveValue('')
  await page.getByRole('button', { name: 'Account', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Sign out' }).click()
  await page.goto('/sign-in?returnTo=%2Faccount%2Fprofile')
  await page.getByLabel('Email address').fill('directory-1@example.com')
  await page.getByLabel('Password').fill('bookstore-admin-test-123')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page).toHaveURL(/\/sign-in/)
  await expect(page.getByRole('alert')).toBeVisible()
  await page.getByLabel('Password').fill('bookstore-reset-password-123')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page).toHaveURL('/account/profile')
  await expect(page.getByText('directory-1@example.com')).toBeVisible()
})

test('revoking the signed-in admin from the customer directory removes access', async ({ page }) => {
  await signIn(page, 'admin-e2e@example.com', '/admin/customers')
  await page.getByLabel('Search customers').fill('admin-e2e@example.com')
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  await page.getByRole('button', { name: 'Revoke admin' }).click()
  await expect(page.getByText('This will remove your own admin access.')).toBeVisible()
  await page.getByRole('button', { name: 'Confirm revoke' }).click()
  await expect(page.getByRole('heading', { name: 'Access denied' })).toBeVisible()
  await expect(page.getByText('directory-1@example.com')).toHaveCount(0)
})
