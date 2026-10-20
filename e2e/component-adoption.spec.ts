import { expect, test, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'

test('adopted tables, forms and empty states fit all languages and themes on mobile and desktop', async ({
  page,
}) => {
  test.setTimeout(180_000)
  await signIn(page)
  for (const width of [375, 1280]) {
    await page.setViewportSize({ width, height: 900 })
    for (const language of ['en', 'ar', 'th', 'zh-Hans']) {
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
        await page.goto('/admin/books')
        await expect(page.getByRole('button', { name: admin.columns, exact: true })).toBeVisible()
        await expect(
          page.getByRole('navigation', { name: admin.breadcrumb, exact: true }),
        ).toBeVisible()
        await page.getByRole('button', { name: admin.columns, exact: true }).click()
        const menu = page.getByRole('menu')
        await expect(menu.getByRole('menuitemcheckbox').first()).toBeVisible()
        await expect
          .poll(async () => {
            const box = await menu.boundingBox()
            return !!box && box.x >= -1 && box.x + box.width <= width + 1
          })
          .toBe(true)
        await page.keyboard.press('Escape')
        await page.goto('/admin/books/new')
        await expect(page.locator('[data-slot="field-label"]').first()).toBeVisible()
        for (const input of await page.locator('main input, main textarea').all()) {
          const box = (await input.boundingBox())!
          expect(box.x).toBeGreaterThanOrEqual(-1)
          expect(box.x + box.width).toBeLessThanOrEqual(width + 1)
        }
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
        ).toBe(true)
        if ((language === 'en' && width === 1280) || (language === 'ar' && width === 375))
          await page.screenshot({
            path: `test-results/adoption-form-${width}-${language}-${theme}.png`,
            fullPage: true,
          })
        await page.goto('/books?search=__adoption_no_match__')
        await expect(page.locator('[data-slot="empty"]')).toBeVisible()
        await expect(page.locator('body')).not.toContainText(
          /@i18n\/|(?:common|storefront|admin):[a-zA-Z]/,
        )
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
        ).toBe(true)
      }
    }
  }
})

async function signIn(page: Page) {
  await page.goto('/sign-in?returnTo=%2Fadmin%2Fbooks')
  await page.request.post('http://localhost:4100/__test__/restore-admin')
  await page.getByLabel('Email address').fill('admin-e2e@example.com')
  await page.getByLabel('Password').fill('bookstore-admin-test-123')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page).toHaveURL('/admin/books')
}

test('columns remain local across server pages and breadcrumbs preserve contextual Back navigation', async ({
  page,
}) => {
  await signIn(page)
  const table = page.getByRole('table')
  const firstTitle = await table.locator('tbody tr').first().locator('strong').innerText()
  await page.getByRole('button', { name: 'Columns', exact: true }).click()
  await expect(page.getByRole('menuitemcheckbox', { name: 'Actions', exact: true })).toHaveCount(0)
  await expect(page.getByRole('menuitemcheckbox', { name: 'Book', exact: true })).toHaveCount(0)
  await page.getByRole('menuitemcheckbox', { name: 'Genre', exact: true }).click()
  await page.keyboard.press('Escape')
  await expect(table.getByRole('columnheader', { name: 'Genre', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Next', exact: true }).click()
  await expect(page).toHaveURL(/page=2/)
  await expect(table.locator('tbody tr').first()).not.toContainText(firstTitle)
  await expect(table.getByRole('columnheader', { name: 'Genre', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Page 2', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  )
  await page.screenshot({ path: 'test-results/adoption-columns-server-page.png', fullPage: true })
  await table
    .locator('tbody tr')
    .first()
    .getByRole('link', { name: /^Edit / })
    .click()
  const breadcrumbs = page.getByRole('navigation', { name: 'Breadcrumb', exact: true })
  await expect(breadcrumbs.locator('[aria-current="page"]')).toHaveText('Edit book')
  await expect(breadcrumbs.getByRole('link', { name: 'Books', exact: true })).toHaveAttribute(
    'href',
    '/admin/books',
  )
  await page.getByRole('link', { name: /Back to books$/ }).click()
  await expect(page).toHaveURL(/page=2/)
  await expect(table.getByRole('columnheader', { name: 'Genre', exact: true })).toBeVisible()
  for (const [route, optionalColumn] of [
    ['/admin/orders', 'Customer'],
    ['/admin/users', 'Email'],
  ]) {
    await page.goto(route)
    await expect(
      table.getByRole('columnheader', { name: optionalColumn, exact: true }),
    ).toBeVisible()
    await page.getByRole('button', { name: 'Columns', exact: true }).click()
    await page.getByRole('menuitemcheckbox', { name: optionalColumn, exact: true }).click()
    await page.keyboard.press('Escape')
    await expect(
      table.getByRole('columnheader', { name: optionalColumn, exact: true }),
    ).toHaveCount(0)
  }
})

test('archive confirmation retains failures and pending Escape cannot dismiss or duplicate the mutation', async ({
  page,
}) => {
  await signIn(page)
  const opener = page
    .getByRole('table')
    .locator('tbody tr')
    .first()
    .getByRole('button', { name: /^More actions for / })
  await opener.click()
  await page.getByRole('menuitem', { name: 'Archive', exact: true }).click()
  const dialog = page.getByRole('alertdialog')
  await expect(dialog.getByRole('button', { name: 'Cancel', exact: true })).toBeFocused()
  let release!: () => void
  const pending = new Promise<void>((resolve) => {
    release = resolve
  })
  let requests = 0
  await page.route('**/graphql', async (route) => {
    const body = route.request().postDataJSON() as { query?: string }
    if (!body.query?.includes('setBookArchived(')) return route.continue()
    requests++
    await pending
    await route.fulfill({
      json: {
        errors: [{ message: 'Fixture failure', extensions: { code: 'INTERNAL_SERVER_ERROR' } }],
      },
    })
  })
  try {
    await dialog.getByRole('button', { name: 'Confirm archive', exact: true }).click()
    await expect(dialog.getByRole('button', { name: 'Cancel', exact: true })).toBeDisabled()
    await page.keyboard.press('Escape')
    await expect(dialog).toBeVisible()
    expect(requests).toBe(1)
    release()
    await expect(dialog.getByRole('alert')).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Confirm archive', exact: true })).toBeEnabled()
    await page.screenshot({ path: 'test-results/adoption-archive-recovery.png' })
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(opener).toBeFocused()
  } finally {
    release()
  }
})
