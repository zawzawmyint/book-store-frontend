import { expect, test } from '@playwright/test'
import enAdmin from '../src/lib/i18n/locales/en/admin.json' with { type: 'json' }
import arAdmin from '../src/lib/i18n/locales/ar/admin.json' with { type: 'json' }
import enCommon from '../src/lib/i18n/locales/en/common.json' with { type: 'json' }
import arCommon from '../src/lib/i18n/locales/ar/common.json' with { type: 'json' }

test('storefront defers workspace pages and denied access never requests them', async ({
  page,
}) => {
  const pageModules: string[] = []
  page.on('request', (request) => {
    if (request.url().includes('/src/features/admin/pages/')) pageModules.push(request.url())
  })
  await page.goto('/books')
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible()
  expect(pageModules).toEqual([])
  await page.goto('/admin/users')
  await expect(page).toHaveURL(/\/sign-in\?returnTo=/)
  await expect(page.getByRole('heading', { name: 'Sign in', exact: true })).toBeVisible()
  expect(pageModules).toEqual([])
})

for (const language of ['en', 'ar'] as const) {
  test(`slow workspace page loading retains navigation and direct refresh works (${language})`, async ({
    page,
  }) => {
    const admin = language === 'ar' ? arAdmin : enAdmin
    const common = language === 'ar' ? arCommon : enCommon
    await page.setExtraHTTPHeaders({ 'X-Real-IP': '192.0.2.230' })
    await page.goto('/sign-in?returnTo=%2Fadmin%2Fbooks')
    await page.getByLabel('Email address').fill('admin-e2e@example.com')
    await page.getByLabel('Password').fill('bookstore-admin-test-123')
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()
    await expect(page).toHaveURL('/admin/books')
    await expect(page.getByLabel('Search books')).toBeVisible()
    if (language === 'ar') {
      await page.evaluate(() => localStorage.setItem('book-store-language', 'ar'))
      await page.reload()
      await expect(page.getByLabel(admin.searchBooks)).toBeVisible()
      await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
    }

    let release!: () => void
    const pending = new Promise<void>((resolve) => {
      release = resolve
    })
    await page.route('**/src/features/admin/pages/UsersPage.tsx*', async (route) => {
      await pending
      await route.continue()
    })
    try {
      await page.getByRole('link', { name: admin.users, exact: true }).click()
      await expect(page.getByRole('status', { name: common.loading, exact: true })).toBeVisible()
      await expect(page.getByRole('navigation', { name: admin.adminNavigation })).toBeVisible()
    } finally {
      release()
    }
    await expect(page.getByLabel(admin.searchUsers)).toBeVisible()
    await page.reload()
    await expect(page).toHaveURL('/admin/users')
    await expect(page.getByLabel(admin.searchUsers)).toBeVisible()
  })
}
