import { expect, test } from '@playwright/test'
import { openAccount, setAppearance, toggleAppearance } from './preferences'

test.beforeEach(async ({ page }) => {
  await page.setExtraHTTPHeaders({ 'X-Real-IP': '192.0.2.247' })
})

test('storefront loads local fonts and exposes icon controls to keyboard users on mobile', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  const fonts = await page.evaluate(async () => {
    const sans = await document.fonts.load('400 16px "Source Sans 3"')
    const serif = await document.fonts.load('400 16px Lora')
    return { sans: sans.length, serif: serif.length }
  })
  expect(fonts.sans).toBeGreaterThan(0)
  expect(fonts.serif).toBeGreaterThan(0)
  expect(
    await page
      .getByRole('heading')
      .first()
      .evaluate((el) => getComputedStyle(el).fontFamily),
  ).toContain('Lora')
  await page.screenshot({ path: testInfo.outputPath('storefront-dark.png') })
  await page.getByRole('button', { name: 'Open navigation', exact: true }).click()
  await expect(
    page
      .getByRole('navigation', { name: 'Mobile navigation' })
      .getByRole('link', { name: 'All books', exact: true }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Close dialog', exact: true }).click()
  for (const name of ['Account']) {
    const action = page.getByRole('button', { name, exact: true })
    await expect(action).toBeVisible()
    const size = await action.boundingBox()
    expect(size!.width).toBeGreaterThanOrEqual(44)
    expect(size!.height).toBeGreaterThanOrEqual(44)
    await expect(action).toHaveText('')
  }
  await openAccount(page)
  const appearance = page.getByRole('menuitem', { name: /Appearance/ })
  await appearance.focus()
  await appearance.press('Enter')
  const light = page.getByRole('menuitemradio', { name: 'Light', exact: true })
  await light.focus()
  await light.press('Space')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath('storefront-light.png') })
  await openAccount(page)
  await page.getByRole('menuitem', { name: 'Sign in', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Sign in', exact: true })).toBeVisible()
})

test('admin icon actions retain navigation, search, and copy feedback', async ({
  page,
  context,
}, testInfo) => {
  expect((await page.request.post('http://localhost:4100/__test__/restore-admin')).ok()).toBe(true)
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/sign-in?returnTo=%2Fadmin%2Fbooks')
  await page.getByLabel('Email address').fill('admin-e2e@example.com')
  await page.getByLabel('Password').fill('bookstore-admin-test-123')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page).toHaveURL('/admin/books')
  expect(
    await page
      .getByRole('heading', { name: 'Manage books', exact: true })
      .evaluate((el) => getComputedStyle(el).fontFamily),
  ).toContain('Source Sans 3')
  await page.getByRole('button', { name: 'Account', exact: true }).click()
  expect(await page.getByRole('menu').evaluate((el) => getComputedStyle(el).fontFamily)).toContain(
    'Source Sans 3',
  )
  await page.screenshot({ path: testInfo.outputPath('admin-dark-menu.png') })
  await page.keyboard.press('Escape')
  await page.getByLabel('Search books').fill('The Great Gatsby')
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  await expect(page).toHaveURL(/search=The\+Great\+Gatsby/)
  const row = page.getByRole('row').filter({ hasText: 'The Great Gatsby' })
  const edit = row.getByRole('link', { name: 'Edit The Great Gatsby', exact: true })
  await expect(edit).toBeVisible()
  // The search refetch briefly replaces the previous table with loading feedback.
  await expect
    .poll(async () => {
      const size = await edit.boundingBox()
      return size ? Math.min(size.width, size.height) : 0
    })
    .toBeGreaterThanOrEqual(44)
  await toggleAppearance(page)
  await row.getByRole('button', { name: 'Adjust stock', exact: true }).click()
  expect(
    await page.getByRole('dialog').evaluate((el) => getComputedStyle(el).fontFamily),
  ).toContain('Source Sans 3')
  await page.screenshot({ path: testInfo.outputPath('admin-light-dialog.png') })
  await page.keyboard.press('Escape')
  await edit.click()
  await expect(page.getByRole('heading', { name: 'Edit book', exact: true })).toBeVisible()
  await page.goto('/admin/books')
  await page
    .getByRole('row')
    .filter({ hasText: 'The Great Gatsby' })
    .getByRole('link', { name: 'History for The Great Gatsby', exact: true })
    .click()
  await expect(page).toHaveURL(/\/history(?:\?|$)/)
  await page.goto('/admin/users')
  await page.getByLabel('Search users').fill('directory-3@example.com')
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  const user = page.getByRole('row').filter({ hasText: 'directory-3@example.com' })
  await user
    .getByRole('button', { name: 'Copy user ID for Directory Reader 3', exact: true })
    .click()
  await expect(page.getByText('User ID copied.', { exact: true })).toBeVisible()
  const copied = await page.evaluate(() => navigator.clipboard.readText())
  await user.getByRole('link', { name: 'View user Directory Reader 3', exact: true }).click()
  expect(new URL(page.url()).pathname).toBe(`/admin/users/${copied}`)
})

test('blocked font requests keep text readable and controls usable', async ({ page }) => {
  let failedFonts = 0
  await page.route('**/*.woff2', (route) => {
    failedFonts += 1
    return route.abort()
  })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await expect(page.getByRole('heading').first()).toBeVisible()
  await page.evaluate(() => document.fonts.ready)
  expect(failedFonts).toBeGreaterThan(0)
  expect(
    await page.evaluate(
      () => [...document.fonts].filter((font) => font.status === 'loaded').length,
    ),
  ).toBe(0)
  await setAppearance(page, 'light')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await openAccount(page)
  await page.getByRole('menuitem', { name: 'Sign in', exact: true }).click()
  await expect(page.getByLabel('Email address')).toBeVisible()
})
