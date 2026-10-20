import { expect, test, type Page } from '@playwright/test'
import arCommon from '../src/lib/i18n/locales/ar/common.json' with { type: 'json' }
import arAdmin from '../src/lib/i18n/locales/ar/admin.json' with { type: 'json' }
import zhStorefront from '../src/lib/i18n/locales/zh-Hans/storefront.json' with { type: 'json' }
import { fillDelivery } from './delivery'
import { hostedPayment } from './hosted-payment'

async function selectLanguage(page: Page, name: string) {
  const dialog = page.getByRole('dialog')
  await (
    (await dialog.count())
      ? dialog.locator('[data-language-switcher]')
      : page.locator('[data-language-switcher]')
  ).click()
  await page.getByRole('option', { name, exact: true }).click()
}

test('four languages persist across reload and keep catalog query context', async ({ page }) => {
  await page.goto('/books?search=the&sort=price-asc')
  expect((await page.locator('[data-language-switcher]').boundingBox())!.width).toBe(44)
  await expect(page.locator('[data-language-switcher] > svg')).toBeVisible()
  for (const [name, id, dir] of [
    ['العربية', 'ar', 'rtl'],
    ['ไทย', 'th', 'ltr'],
    ['简体中文', 'zh-Hans', 'ltr'],
    ['English', 'en', 'ltr'],
  ]) {
    await selectLanguage(page, name)
    await expect(page.locator('html')).toHaveAttribute('lang', id)
    await expect(page.locator('html')).toHaveAttribute('dir', dir)
    await expect(page).toHaveURL('/books?search=the&sort=price-asc')
    await page.reload()
    await expect(page.locator('[data-language-switcher]')).toHaveText(name)
    expect(await page.evaluate(() => localStorage.getItem('book-store-language'))).toBe(id)
    await page.setViewportSize({ width: 375, height: 812 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: `test-results/localization-${id}-mobile.png` })
    await page.setViewportSize({ width: 1280, height: 900 })
  }
})

test('switches visible validation without losing a dirty signup form', async ({ page }) => {
  await page.goto('/sign-up?returnTo=%2Fcheckout')
  await page.getByRole('textbox', { name: 'Full name' }).fill('A multilingual reader')
  await page.getByRole('button', { name: 'Create account', exact: true }).click()
  await expect(page.getByRole('alert').first()).toBeVisible()
  await selectLanguage(page, '简体中文')
  await expect(page.getByRole('textbox', { name: zhStorefront.fullName })).toHaveValue(
    'A multilingual reader',
  )
  await expect(page.getByText(zhStorefront.enterAValidEmailAddress, { exact: true })).toBeVisible()
  await expect(page).toHaveURL('/sign-up?returnTo=%2Fcheckout')
})

test('Arabic admin sidebar, search portal and mobile dialog retain permission and focus behavior', async ({
  page,
  request,
}) => {
  expect((await request.post('http://localhost:4100/__test__/seed-demo')).ok()).toBe(true)
  await page.goto('/sign-in')
  await page.getByRole('button', { name: 'Demo Admin', exact: true }).click()
  await expect(page).toHaveURL('/admin')
  expect((await page.locator('[data-language-switcher]').boundingBox())!.width).toBe(44)
  await selectLanguage(page, 'العربية')
  const sidebar = page.locator('[data-slot="sidebar"][data-side]')
  await expect(sidebar).toHaveAttribute('data-side', 'right')
  await page.getByRole('button', { name: arAdmin.searchWorkspace, exact: true }).click()
  const search = page.getByRole('dialog')
  await expect(search).toBeVisible()
  const dialogBox = (await search.boundingBox())!
  const closeBox = (await search
    .getByRole('button', { name: arCommon.closeDialog, exact: true })
    .boundingBox())!
  expect(closeBox.x).toBeLessThan(dialogBox.x + dialogBox.width / 2)
  const searchInput = search.locator('input[role="combobox"]')
  await searchInput.fill('Gatsby')
  const originalDialog = await search.elementHandle()
  await selectLanguage(page, '简体中文')
  await expect(searchInput).toHaveValue('Gatsby')
  expect(await originalDialog!.evaluate((element) => element.isConnected)).toBe(true)
  await selectLanguage(page, 'العربية')
  await page.keyboard.press('Escape')
  await expect(search).toHaveCount(0)
  await page.setViewportSize({ width: 375, height: 812 })
  const menu = page.getByRole('button', { name: arAdmin.adminMenu, exact: true })
  await menu.click()
  const sheet = page.getByRole('dialog', { name: arCommon.sidebar, exact: true })
  await expect(sheet).toBeVisible()
  expect((await sheet.boundingBox())!.x).toBeGreaterThanOrEqual(0)
  await page.keyboard.press('Escape')
  await expect(sheet).toHaveCount(0)
  await expect(menu).toBeFocused()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: 'test-results/localization-ar-admin-mobile.png', fullPage: true })
  await page.setViewportSize({ width: 1280, height: 900 })
  await selectLanguage(page, 'English')
  await expect(sidebar).toHaveAttribute('data-side', 'left')
})

test('malformed and blocked preference storage leave the UI usable', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('book-store-language', 'unsupported')
    Storage.prototype.getItem = () => {
      throw new Error('blocked')
    }
    Storage.prototype.setItem = () => {
      throw new Error('blocked')
    }
  })
  await page.goto('/books')
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await selectLanguage(page, 'ไทย')
  await expect(page.locator('html')).toHaveAttribute('lang', 'th')
})

test('Chinese checkout preserves the address, canonical payload and payment recovery identity', async ({
  page,
  request,
}) => {
  expect((await request.post('http://localhost:4100/__test__/seed-demo')).ok()).toBe(true)
  await hostedPayment(page)
  await page.goto('/sign-in')
  await page.getByRole('button', { name: 'Demo Customer', exact: true }).click()
  await expect(page).toHaveURL('/')
  // The demo account is shared by fixture journeys; start with its server cart empty.
  const current = await page.request.post('/graphql', {
    headers: { Origin: 'http://localhost:4173' },
    data: { query: '{ myCart { revision items { bookId } } }' },
  })
  const body = await current.json()
  expect(body.errors).toBeUndefined()
  let revision = body.data.myCart.revision
  for (const item of body.data.myCart.items) {
    const cleared = await page.request.post('/graphql', {
      headers: { Origin: 'http://localhost:4173' },
      data: {
        query: 'mutation ($input: SetCartItemInput!) { setCartItem(input: $input) { revision } }',
        variables: {
          input: {
            bookId: item.bookId,
            quantity: 0,
            expectedRevision: revision,
            requestKey: crypto.randomUUID(),
          },
        },
      },
    })
    const result = await cleared.json()
    expect(result.errors).toBeUndefined()
    revision = result.data.setCartItem.revision
  }
  await page.goto('/books/1')
  await page
    .getByRole('form', { name: 'Book purchase' })
    .getByRole('button', { name: 'Add to bag', exact: true })
    .click()
  await page.getByRole('link', { name: /View bag/ }).click()
  await page.getByRole('link', { name: /Continue to checkout/ }).click()
  await fillDelivery(page)
  await selectLanguage(page, '简体中文')
  await expect(page.getByLabel(zhStorefront.addressLine1, { exact: true })).toHaveValue(
    '123 Reading Lane',
  )
  await page.getByRole('button', { name: zhStorefront.reviewOrder, exact: true }).click()
  const submission = page.waitForRequest(
    (request) =>
      request.url().endsWith('/graphql') && request.postData()?.includes('CreateCheckout') === true,
  )
  await page.getByRole('button', { name: zhStorefront.continueToPayment, exact: true }).click()
  const input = (await submission).postDataJSON().variables.input
  expect(input.deliveryAddress.countryCode).toBe('US')
  expect(input.items).toEqual([{ bookId: '1', quantity: 1 }])
  expect(input.requestKey).toBeTruthy()
  expect(input.expectedTotalCents).toBeGreaterThan(0)
  await expect(
    page.getByRole('heading', { name: zhStorefront.paymentConfirmed, exact: true }),
  ).toBeVisible()
  await expect(page).toHaveURL(/\/checkout\/return\/\d+/)
})

test('book-save notice survives reload as a canonical kind and mixed-script data is isolated in Arabic', async ({
  page,
  request,
}) => {
  expect((await request.post('http://localhost:4100/__test__/seed-demo')).ok()).toBe(true)
  await page.goto('/sign-in')
  await page.getByRole('button', { name: 'Demo Admin', exact: true }).click()
  await expect(page).toHaveURL('/admin')
  await page.goto('/admin/books/1/edit')
  await page.getByRole('button', { name: 'Save book', exact: true }).click()
  await expect(page).toHaveURL('/admin/books')
  await expect(page.getByRole('status').filter({ hasText: 'Book updated.' })).toBeVisible()
  await selectLanguage(page, 'العربية')
  await page.reload()
  await expect(page.getByRole('status').filter({ hasText: arAdmin.bookUpdated2 })).toBeVisible()
  await expect(page.locator('body')).not.toContainText('@i18n/')
  await expect(
    page.locator('bdi[dir="auto"]').filter({ hasText: 'The Great Gatsby' }).first(),
  ).toBeVisible()
  await page.getByRole('button', { name: arAdmin.account, exact: true }).click()
  await expect(
    page.getByRole('menu').locator('bdi[dir="ltr"]').filter({ hasText: '@example.com' }),
  ).toBeVisible()
})
