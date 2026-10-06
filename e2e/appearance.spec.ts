import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.setExtraHTTPHeaders({ 'X-Real-IP': '192.0.2.249' })
})

test('dark defaults before React, saved light persists, and device settings do not override it', async ({
  page,
  browser,
}) => {
  const bootstrap = await browser.newContext({ colorScheme: 'light' })
  try {
    const initial = await bootstrap.newPage()
    await initial.route('**/src/main.tsx', (route) => route.abort())
    await initial.goto('/')
    await expect(initial.locator('html')).toHaveClass(/dark/)
    await initial.evaluate(() => localStorage.setItem('book-store-theme', 'light'))
    await initial.reload()
    await expect(initial.locator('html')).not.toHaveClass(/dark/)
  } finally {
    await bootstrap.close()
  }
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto('/')
  const toggle = page.getByRole('switch', { name: 'Dark mode', exact: true })
  await expect(toggle).toHaveAttribute('aria-checked', 'true')
  await toggle.focus()
  await page.keyboard.press('Space')
  await expect(toggle).toHaveAttribute('aria-checked', 'false')
  await expect(toggle).toBeFocused()
  await page.reload()
  await expect(toggle).toHaveAttribute('aria-checked', 'false')
  await page.emulateMedia({ colorScheme: 'dark' })
  await expect(toggle).toHaveAttribute('aria-checked', 'false')
  const sibling = await page.context().newPage()
  try {
    await sibling.goto('/')
    await sibling.getByRole('switch', { name: 'Dark mode', exact: true }).click()
    await expect(toggle).toHaveAttribute('aria-checked', 'true')
    await sibling.evaluate(() => localStorage.setItem('book-store-theme', 'light'))
    await expect(toggle).toHaveAttribute('aria-checked', 'false')
    await sibling.evaluate(() => localStorage.removeItem('book-store-theme'))
    await expect(toggle).toHaveAttribute('aria-checked', 'true')
  } finally {
    await sibling.close()
  }
})

test('switching preserves cart and admin form state and themes mobile overlays', async ({
  page,
}) => {
  await page.goto('/books/1')
  await page.getByRole('button', { name: 'Add to bag', exact: true }).click()
  const savedCart = await page.evaluate(() => localStorage.getItem('book-store-cart'))
  await page.getByRole('switch', { name: 'Dark mode', exact: true }).click()
  expect(await page.evaluate(() => localStorage.getItem('book-store-cart'))).toBe(savedCart)
  expect((await page.request.post('http://localhost:4100/__test__/restore-admin')).ok()).toBe(true)
  await page.goto('/sign-in?returnTo=%2Fadmin%2Fbooks%2F1%2Fedit')
  await page.getByLabel('Email address').fill('admin-e2e@example.com')
  await page.getByLabel('Password').fill('bookstore-admin-test-123')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page).toHaveURL('/admin/books/1/edit')
  await expect(page.getByRole('heading', { name: 'Edit book', exact: true })).toBeVisible()
  const description = page.getByLabel('Description', { exact: true })
  await description.fill('Unsaved theme check')
  await page.getByRole('switch', { name: 'Dark mode', exact: true }).click()
  await expect(description).toHaveValue('Unsaved theme check')
  await expect(page).toHaveURL('/admin/books/1/edit')
  await page.goto('/admin/books')
  await page.getByLabel('Search books').fill('The Great Gatsby')
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  await page
    .getByRole('row')
    .filter({ hasText: 'The Great Gatsby' })
    .getByRole('button', { name: 'Adjust stock', exact: true })
    .click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  const colors = await dialog.evaluate((element) => ({
    background: getComputedStyle(element).backgroundColor,
    color: getComputedStyle(element).color,
  }))
  expect(colors.background).not.toBe('rgb(247, 245, 240)')
  expect(colors.background).not.toBe('rgb(255, 255, 255)')
  await page.screenshot({ path: 'test-results/appearance-admin-dark.png', fullPage: true })
  await page.keyboard.press('Escape')
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: 'Admin menu', exact: true }).click()
  await expect(page.getByRole('navigation', { name: 'Admin navigation' })).toBeVisible()
  await page.screenshot({ path: 'test-results/appearance-admin-mobile-dark.png', fullPage: true })
  await page.keyboard.press('Escape')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.getByRole('button', { name: 'Account', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Sign out', exact: true }).click()
  await expect(page.getByRole('switch', { name: 'Dark mode', exact: true })).toHaveAttribute(
    'aria-checked',
    'true',
  )
  await page.goto('/cart')
  await expect(page.getByRole('link', { name: 'The Great Gatsby', exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: 'test-results/appearance-store-mobile-dark.png', fullPage: true })
  await page.getByRole('switch', { name: 'Dark mode', exact: true }).click()
  await page.screenshot({ path: 'test-results/appearance-store-mobile-light.png', fullPage: true })
})
