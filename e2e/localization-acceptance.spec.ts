import { expect, test, type Page, type TestInfo } from '@playwright/test'
import { openAccount } from './preferences'
import { mkdir, readFile, writeFile, rm } from 'node:fs/promises'
import { join, resolve, sep } from 'node:path'
import { deliveryAddress } from './delivery'

const origin = 'http://localhost:4173'
const languages = ['en', 'ar', 'th', 'zh-Hans'] as const
const modes = ['desktop', 'mobile', 'zoom200'] as const

type Audit = {
  route: string
  width: number
  pageWidth: number
  headings: string[]
  accessibility: string
}

async function capture(page: Page, path: string, fullPage = true) {
  // Native browser zoom changes DIP-to-CSS mapping. CDP contentSize preserves
  // the full browser raster; Playwright's CSS clip crops it at native 200% zoom.
  const session = await page.context().newCDPSession(page)
  try {
    const metrics = await session.send('Page.getLayoutMetrics')
    const shot = await session.send('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: fullPage,
      ...(fullPage ? { clip: { ...metrics.contentSize, scale: 1 } } : {}),
    })
    await writeFile(path, Buffer.from(shot.data, 'base64'))
  } finally {
    await session.detach()
  }
}

async function audit(page: Page, route: string, records: Audit[], screenshot?: string) {
  await page.goto(origin + route)
  await page.waitForLoadState('networkidle')
  await expect(page.locator('body')).not.toContainText(
    /@i18n\/|(?:common|storefront|admin):[a-zA-Z]/,
  )
  const geometry = await page.evaluate(() => ({
    width: innerWidth,
    pageWidth: document.documentElement.scrollWidth,
  }))
  expect(geometry.pageWidth, route).toBeLessThanOrEqual(geometry.width + 1)
  for (const brand of await page.locator('[data-brand]').all()) {
    const punctuation = await brand.evaluate((element) => {
      const text = element.firstChild!
      const end = text.textContent!.trimEnd().length
      const range = document.createRange()
      range.setStart(text, end - 1)
      range.setEnd(text, end)
      return {
        lastGlyphRight: range.getBoundingClientRect().right,
        dotLeft: element.querySelector('.text-copper')!.getBoundingClientRect().left,
      }
    })
    expect(
      punctuation.dotLeft,
      'Latin brand punctuation must follow its final glyph',
    ).toBeGreaterThanOrEqual(punctuation.lastGlyphRight - 1)
  }
  records.push({
    route,
    ...geometry,
    headings: await page.getByRole('heading').allTextContents(),
    accessibility: await page.locator('body').ariaSnapshot(),
  })
  if (screenshot) await capture(page, screenshot)
}

async function checkLanguageKeyboard(page: Page, label: string) {
  const trigger = await openAccount(page)
  const language = page.getByRole('menuitem', { name: new RegExp(label) })
  await language.focus()
  await language.press('Enter')
  for (const name of ['English', 'العربية', 'ไทย', '简体中文'])
    await expect(page.getByRole('menuitemradio', { name, exact: true })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(trigger).toBeFocused()
}

async function assertDialogFits(page: Page, role: 'dialog' | 'alertdialog' = 'dialog') {
  const dialog = page.getByRole(role)
  await expect(dialog).toBeVisible()
  const box = (await dialog.boundingBox())!
  const viewport = await page.evaluate(() => ({ width: innerWidth, height: innerHeight }))
  expect(box.x).toBeGreaterThanOrEqual(-1)
  expect(box.y).toBeGreaterThanOrEqual(-1)
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1)
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1)
}

async function checkQuickInbox(page: Page, title: string, screenshot: string) {
  const bell = page.locator('header').getByRole('button', { name: new RegExp(`^${title}`) })
  await bell.click()
  await assertDialogFits(page)
  await expect(
    page.getByRole('dialog').locator('[data-slot="item"], [data-slot="empty"]'),
  ).not.toHaveCount(0)
  await capture(page, screenshot, false)
  await page.keyboard.press('Escape')
  await expect(bell).toBeFocused()
}

for (const [languageIndex, language] of languages.entries()) {
  for (const [modeIndex, mode] of modes.entries()) {
    test(`${language} ${mode}: route groups, themes, overlays and actual zoom`, async ({
      playwright,
    }, info: TestInfo) => {
      const common = JSON.parse(
        await readFile(
          new URL(`../src/lib/i18n/locales/${language}/common.json`, import.meta.url),
          'utf8',
        ),
      ) as Record<string, string>
      const storefront = JSON.parse(
        await readFile(
          new URL(`../src/lib/i18n/locales/${language}/storefront.json`, import.meta.url),
          'utf8',
        ),
      ) as Record<string, string>
      const admin = JSON.parse(
        await readFile(
          new URL(`../src/lib/i18n/locales/${language}/admin.json`, import.meta.url),
          'utf8',
        ),
      ) as Record<string, string>
      for (const theme of ['light', 'dark']) {
        const records: Audit[] = []
        const profile = resolve(info.outputPath(`${theme}-profile`))
        if (!profile.startsWith(resolve(info.outputDir) + sep))
          throw new Error('Refusing a profile outside this test output directory')
        await mkdir(join(profile, 'Default'), { recursive: true })
        // Chromium's native zoom preference, not CSS zoom, viewport scaling or pinch emulation.
        await writeFile(
          join(profile, 'Default', 'Preferences'),
          JSON.stringify({
            partition: {
              default_zoom_level: { x: mode === 'zoom200' ? Math.log(2) / Math.log(1.2) : 0 },
            },
          }),
        )
        const context = await playwright.chromium.launchPersistentContext(profile, {
          channel: process.env.LOCALIZATION_BROWSER_CHANNEL ?? 'chromium',
          headless: true,
          viewport:
            mode === 'zoom200' ? null : { width: mode === 'mobile' ? 375 : 1280, height: 900 },
          args: ['--window-size=1280,1000', '--force-device-scale-factor=1'],
        })
        const page = context.pages()[0]!
        const scriptErrors: string[] = []
        page.on('pageerror', (error) => scriptErrors.push(error.message))
        await context.setExtraHTTPHeaders({
          'X-Real-IP': `198.51.100.${40 + languageIndex * 20 + modeIndex * 3 + (theme === 'dark' ? 1 : 0)}`,
        })
        const picture = (name: string) => info.outputPath(`${theme}-${name}.png`)
        try {
          await page.goto(origin)
          // Seed once. Reload/logout assertions must observe the app's persistence.
          await page.evaluate(
            ({ language, theme }) => {
              localStorage.setItem('book-store-language', language)
              localStorage.setItem('book-store-theme', theme)
            },
            { language, theme },
          )
          for (const route of [
            '/',
            '/books',
            '/books/1',
            '/cart',
            '/sign-in',
            '/sign-up',
            '/forgot-password',
            '/reset-password',
            '/check-email',
            '/verification-result',
            '/not-a-route',
          ]) {
            await audit(page, route, records, route === '/books/1' ? picture('book') : undefined)
          }
          await page.goto(origin + '/books')
          const storeSearch = page.getByRole('button', {
            name: common.openStoreSearch,
            exact: true,
          })
          await storeSearch.click()
          await assertDialogFits(page)
          await page
            .getByRole('combobox', { name: common.searchTheStore, exact: true })
            .fill('Gatsby')
          await expect(page.getByRole('dialog').getByRole('option').first()).toBeVisible()
          await expect(
            page.getByRole('dialog').getByRole('option', { selected: true }),
          ).toHaveCount(0)
          await capture(page, picture('storefront-search'), false)
          await page.keyboard.press('Escape')
          await expect(storeSearch).toBeFocused()
          await page.goto(origin + '/sign-up')
          await page
            .getByRole('textbox', { name: storefront.fullName, exact: true })
            .fill('قارئ อ่าน者 Reader')
          await page.getByRole('button', { name: storefront.createAccount, exact: true }).click()
          await expect(
            page.getByText(storefront.enterAValidEmailAddress, { exact: true }),
          ).toBeVisible()
          await expect(
            page.getByRole('textbox', { name: storefront.fullName, exact: true }),
          ).toHaveValue('قارئ อ่าน者 Reader')
          await capture(page, picture('validation'))
          await checkLanguageKeyboard(page, common.language)
          await expect(page.locator('html')).toHaveAttribute('lang', language)
          await expect(page.locator('html')).toHaveAttribute(
            'dir',
            language === 'ar' ? 'rtl' : 'ltr',
          )
          const zoom = await page.evaluate(() => ({
            dpr: devicePixelRatio,
            scale: visualViewport!.scale,
            width: innerWidth,
          }))
          expect(zoom.dpr).toBe(mode === 'zoom200' ? 2 : 1)
          expect(zoom.scale).toBe(1)
          const metricsSession = await context.newCDPSession(page)
          const metrics = await metricsSession.send('Page.getLayoutMetrics')
          expect(metrics.cssVisualViewport.zoom).toBe(mode === 'zoom200' ? 2 : 1)
          await metricsSession.detach()
          if (mode === 'zoom200') expect(zoom.width).toBeLessThan(700)
          if (mode === 'mobile') expect(zoom.width).toBe(375)

          const signedIn = await context.request.post(origin + '/api/auth/sign-in/email', {
            headers: { Origin: origin },
            data: { email: 'admin-e2e@example.com', password: 'bookstore-admin-test-123' },
          })
          expect(signedIn.ok()).toBe(true)
          const signedBody = await signedIn.json()
          const userId = signedBody.user.id as string
          for (const route of [
            '/account/profile',
            '/account/orders',
            '/account/orders/1',
            '/checkout/return/1',
          ]) {
            await audit(page, route, records)
          }
          await checkQuickInbox(page, common.notificationTitle, picture('storefront-notifications'))
          // Add one line through the canonical server cart API; this never touches local/development data.
          const cart = await context.request.post(origin + '/graphql', {
            headers: { Origin: origin },
            data: { query: '{ myCart { revision } }' },
          })
          const cartBody = await cart.json()
          expect(cartBody.errors).toBeUndefined()
          const setLine = await context.request.post(origin + '/graphql', {
            headers: { Origin: origin },
            data: {
              query:
                'mutation ($input: SetCartItemInput!) { setCartItem(input: $input) { revision } }',
              variables: {
                input: {
                  bookId: '1',
                  quantity: 1,
                  expectedRevision: cartBody.data.myCart.revision,
                  requestKey: crypto.randomUUID(),
                },
              },
            },
          })
          expect((await setLine.json()).errors).toBeUndefined()
          await audit(page, '/checkout', records, picture('delivery'))
          for (const [key, value] of Object.entries({
            recipientName: deliveryAddress.recipientName,
            phoneNumber: deliveryAddress.phone,
            addressLine1: deliveryAddress.addressLine1,
            city: deliveryAddress.city,
          })) {
            await page.getByLabel(storefront[key], { exact: true }).fill(value)
          }
          await page.getByLabel(storefront.country, { exact: true }).selectOption('US')
          await page.getByRole('button', { name: storefront.reviewOrder, exact: true }).click()
          await expect(
            page.getByRole('button', { name: storefront.continueToPayment, exact: true }),
          ).toBeEnabled()
          await capture(page, picture('checkout-review'))

          for (const route of [
            '/admin',
            '/admin/books',
            '/admin/books/new',
            '/admin/books/1/edit',
            '/admin/orders',
            '/admin/orders/1',
            '/admin/users',
            `/admin/users/${userId}`,
            '/admin/activity',
            '/admin/books/1/history',
            '/admin/profile',
          ]) {
            await audit(
              page,
              route,
              records,
              route === '/admin'
                ? picture('dashboard')
                : route === '/admin/books/new'
                  ? picture('book-form')
                  : undefined,
            )
          }
          await page.goto(origin + '/admin/books')
          await page.waitForLoadState('networkidle')
          const columns = page.getByRole('button', { name: admin.columns, exact: true })
          await columns.click()
          const menu = page.getByRole('menu')
          await expect(menu.getByRole('menuitemcheckbox').first()).toBeChecked()
          const menuBox = (await menu.boundingBox())!
          expect(menuBox.x).toBeGreaterThanOrEqual(-1)
          expect(menuBox.x + menuBox.width).toBeLessThanOrEqual(
            await page.evaluate(() => innerWidth + 1),
          )
          await capture(page, picture('columns-menu'), false)
          await page.keyboard.press('Escape')
          await expect(columns).toBeFocused()
          await expect(
            page.getByRole('navigation', { name: admin.breadcrumb, exact: true }),
          ).toBeVisible()
          const archiveOpener = page
            .getByRole('table')
            .locator('tbody tr')
            .first()
            .locator('button[aria-haspopup="menu"]')
          await archiveOpener.click()
          await page.getByRole('menuitem', { name: common.labelArchive, exact: true }).click()
          await assertDialogFits(page, 'alertdialog')
          await expect(
            page.getByRole('alertdialog').getByRole('button', { name: admin.cancel, exact: true }),
          ).toBeFocused()
          await capture(page, picture('archive-dialog'), false)
          await page.keyboard.press('Escape')
          await expect(archiveOpener).toBeFocused()
          const stockOpener = page
            .getByRole('button', { name: admin.adjustStock, exact: true })
            .first()
          await stockOpener.click()
          await assertDialogFits(page)
          await capture(page, picture('stock-dialog'), false)
          await page.keyboard.press('Escape')
          await expect(stockOpener).toBeFocused()
          const searchOpener = page.getByRole('button', {
            name: admin.searchWorkspace,
            exact: true,
          })
          await searchOpener.click()
          await assertDialogFits(page)
          await page.getByRole('dialog').locator('input[role="combobox"]').fill('Gatsby')
          await expect(page.getByRole('dialog').getByRole('option').first()).toBeVisible()
          await capture(page, picture('workspace-search'), false)
          await page.keyboard.press('Escape')
          await expect(searchOpener).toBeFocused()
          await checkQuickInbox(page, common.notificationTitle, picture('workspace-notifications'))
          await checkLanguageKeyboard(page, common.language)
          await page.getByRole('button', { name: admin.account, exact: true }).click()
          await page.getByRole('menuitem', { name: admin.signOut, exact: true }).click()
          await expect(page).toHaveURL(origin + '/sign-in')
          expect(await page.evaluate(() => localStorage.getItem('book-store-language'))).toBe(
            language,
          )
          await checkLanguageKeyboard(page, common.language)
          expect(scriptErrors).toEqual([])
        } finally {
          await writeFile(
            info.outputPath(`${theme}-audit.json`),
            JSON.stringify({ language, mode, theme, records }, null, 2),
          )
          await context.close()
          await rm(profile, { recursive: true, force: true, maxRetries: 3 })
        }
      }
    })
  }
}
