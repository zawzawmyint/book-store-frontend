import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'

test('guest preferences live in Account and storefront finder previews books without losing catalog submission', async ({
  page,
}) => {
  await page.goto('/')
  const header = page.locator('header')
  await expect(header.getByRole('combobox')).toHaveCount(0)
  await expect(header.getByRole('switch')).toHaveCount(0)
  await header.getByRole('button', { name: 'Account', exact: true }).click()
  await expect(page.getByRole('menuitem', { name: 'Sign in', exact: true })).toBeVisible()
  await page.getByRole('menuitem', { name: /Appearance/ }).click()
  await page.getByRole('menuitemradio', { name: 'Light', exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await header.getByRole('button', { name: 'Open store search', exact: true }).click()
  const finder = page.getByRole('dialog', { name: 'Find your next read', exact: true })
  await expect(finder.locator('[data-language-switcher]')).toHaveCount(0)
  const input = finder.getByRole('combobox', { name: 'Search the store', exact: true })
  await expect(input).toBeFocused()
  const drawerBox = (await finder.boundingBox())!
  expect(drawerBox.x).toBe(0)
  expect(drawerBox.width).toBe(await page.evaluate(() => innerWidth))
  await expect
    .poll(async () => {
      const box = (await finder.boundingBox())!
      const headerBox = (await header.boundingBox())!
      return Math.abs(box.y - headerBox.y - headerBox.height)
    })
    .toBeLessThan(2)
  await input.fill('Gatsby')
  await expect(finder.getByRole('option', { name: /The Great Gatsby/ })).toBeVisible()
  await page.screenshot({ path: 'test-results/search-finder-storefront.png' })
  await input.press('ArrowDown')
  await input.press('Enter')
  await expect(page).toHaveURL('/books/1')
  await header.getByRole('button', { name: 'Open store search', exact: true }).click()
  await page.getByRole('combobox', { name: 'Search the store', exact: true }).fill('Jane')
  await expect(
    page.getByRole('option', { name: /Jane Eyre|Pride and Prejudice/ }).first(),
  ).toBeVisible()
  await expect(page.getByRole('option', { selected: true })).toHaveCount(0)
  await page.getByRole('combobox', { name: 'Search the store', exact: true }).press('Enter')
  await expect(page).toHaveURL('/books?search=Jane')
})

test('storefront previews discard old terms and reset when reopened', async ({ page }) => {
  await page.goto('/books')
  const opener = page.getByRole('button', { name: 'Open store search', exact: true })
  await opener.click()
  const input = page.getByRole('combobox', { name: 'Search the store', exact: true })
  await input.fill('Gatsby')
  await expect(page.getByRole('option', { name: /The Great Gatsby/ })).toBeVisible()
  await input.fill('Jane')
  await expect(page.getByRole('option', { name: /The Great Gatsby/ })).toHaveCount(0)
  await expect(
    page.getByRole('option', { name: /Jane Eyre|Pride and Prejudice/ }).first(),
  ).toBeVisible()
  await input.press('Escape')
  await expect(opener).toBeFocused()
  await opener.click()
  await expect(input).toHaveValue('')
  await expect(page.getByRole('option')).toHaveCount(0)
  await input.fill('x')
  await expect(page.getByRole('dialog')).toContainText('Search by title, author, or genre.')
  await expect(page.getByRole('option')).toHaveCount(0)
})

test('top drawers fit both shells, four languages, both themes and mobile/desktop viewports', async ({
  page,
}) => {
  test.setTimeout(120_000)
  await page.goto('/sign-in?returnTo=%2Fadmin%2Fbooks')
  await page.request.post('http://localhost:4100/__test__/restore-admin')
  await page.getByLabel('Email address').fill('admin-e2e@example.com')
  await page.getByLabel('Password').fill('bookstore-admin-test-123')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page).toHaveURL('/admin/books')
  for (const width of [375, 1280]) {
    await page.setViewportSize({ width, height: 900 })
    for (const language of ['en', 'ar', 'th', 'zh-Hans']) {
      const common = JSON.parse(
        await readFile(
          new URL(`../src/lib/i18n/locales/${language}/common.json`, import.meta.url),
          'utf8',
        ),
      )
      const admin = JSON.parse(
        await readFile(
          new URL(`../src/lib/i18n/locales/${language}/admin.json`, import.meta.url),
          'utf8',
        ),
      )
      for (const theme of ['light', 'dark']) {
        await page.evaluate(
          ({ language, theme }) => {
            localStorage.setItem('book-store-language', language)
            localStorage.setItem('book-store-theme', theme)
          },
          { language, theme },
        )
        for (const route of ['/books', '/admin/books']) {
          await page.goto(route)
          const opener = page.getByRole('button', {
            name: route.startsWith('/admin') ? admin.searchWorkspace : common.openStoreSearch,
            exact: true,
          })
          await opener.click()
          const drawer = page.getByRole('dialog')
          await drawer.getByRole('combobox').fill('Gatsby')
          await expect(drawer.getByRole('option', { name: /The Great Gatsby/ })).toBeVisible()
          await expect
            .poll(async () => {
              const box = (await drawer.boundingBox())!
              const header = (await page.locator('header').boundingBox())!
              return (
                Math.abs(box.x - header.x) <= 1 &&
                Math.abs(box.width - header.width) <= 1 &&
                box.y >= header.y + header.height - 1 &&
                box.y + box.height <= 901 &&
                box.height <= 631
              )
            })
            .toBe(true)
          await expect(drawer.locator('[data-language-switcher]')).toHaveCount(0)
          await expect(page.locator('html')).toHaveAttribute(
            'dir',
            language === 'ar' ? 'rtl' : 'ltr',
          )
          if (language === 'ar' || language === 'en')
            await page.screenshot({
              path: `test-results/search-drawer-${width}-${language}-${theme}-${route.startsWith('/admin') ? 'admin' : 'storefront'}.png`,
            })
          await page.keyboard.press('Escape')
          await expect(opener).toBeFocused()
        }
      }
    }
  }
})

test('workspace drawer follows expanded and collapsed sidebar bounds in LTR and RTL', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/sign-in?returnTo=%2Fadmin')
  await page.request.post('http://localhost:4100/__test__/restore-admin')
  await page.getByLabel('Email address').fill('admin-e2e@example.com')
  await page.getByLabel('Password').fill('bookstore-admin-test-123')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page).toHaveURL('/admin')
  for (const language of ['en', 'ar']) {
    const admin = JSON.parse(
      await readFile(
        new URL(`../src/lib/i18n/locales/${language}/admin.json`, import.meta.url),
        'utf8',
      ),
    )
    await page.evaluate(
      (language) => localStorage.setItem('book-store-language', language),
      language,
    )
    await page.reload()
    for (const collapsed of [false, true]) {
      await page.getByRole('button', { name: admin.searchWorkspace, exact: true }).click()
      const drawer = page.getByRole('dialog')
      await expect
        .poll(async () => {
          const box = await drawer.boundingBox()
          const header = await page.locator('header').boundingBox()
          return (
            !!box &&
            !!header &&
            Math.abs(box.x - header.x) <= 1 &&
            Math.abs(box.width - header.width) <= 1
          )
        })
        .toBe(true)
      expect((await page.locator('[data-slot="dialog-overlay"]').boundingBox())!.y).toBe(0)
      await page.setViewportSize({ width: 1180, height: 900 })
      await expect
        .poll(async () => {
          const box = (await drawer.boundingBox())!
          const header = (await page.locator('header').boundingBox())!
          return Math.abs(box.x - header.x) <= 1 && Math.abs(box.width - header.width) <= 1
        })
        .toBe(true)
      await page.screenshot({
        path: `test-results/search-sidebar-${language}-${collapsed ? 'collapsed' : 'expanded'}.png`,
      })
      await page.keyboard.press('Escape')
      await page.setViewportSize({ width: 1280, height: 900 })
      await page
        .getByRole('button', {
          name: collapsed ? admin.expandSidebar : admin.collapseSidebar,
          exact: true,
        })
        .click()
    }
  }
})

test('admin finder retains grouped keyboard search and preferences while fitting mobile', async ({
  page,
}) => {
  await page.goto('/sign-in?returnTo=%2Fadmin%2Fbooks')
  await page.request.post('http://localhost:4100/__test__/restore-admin')
  await page.getByLabel('Email address').fill('admin-e2e@example.com')
  await page.getByLabel('Password').fill('bookstore-admin-test-123')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page).toHaveURL('/admin/books')
  await expect(page.locator('header [data-language-switcher]')).toHaveCount(0)
  await expect(page.locator('header').getByRole('switch')).toHaveCount(0)
  await page.getByRole('button', { name: 'Search workspace', exact: true }).click()
  const finder = page.getByRole('dialog', { name: 'Search workspace', exact: true })
  await expect(finder.locator('[data-language-switcher]')).toHaveCount(0)
  await finder.getByRole('combobox').fill('Gatsby')
  await expect(finder.getByRole('option', { name: /The Great Gatsby/ })).toBeVisible()
  expect((await finder.boundingBox())!.y).toBeLessThan(160)
  await page.screenshot({ path: 'test-results/search-finder-admin.png' })
  await page.keyboard.press('Escape')
  await page.setViewportSize({ width: 375, height: 812 })
  await page.getByRole('button', { name: 'Account', exact: true }).click()
  await page.getByRole('menuitem', { name: /Language/ }).click()
  await page.getByRole('menuitemradio', { name: 'العربية', exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
