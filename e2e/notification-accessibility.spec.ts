import { expect, test } from '@playwright/test'
import { mkdir, mkdtemp, readFile, writeFile, rm } from 'node:fs/promises'
import { join, resolve, sep } from 'node:path'
import { tmpdir } from 'node:os'

test('notification inboxes and mobile bell remain usable in four languages and both themes', async ({
  page,
}) => {
  test.setTimeout(120_000)
  await page.setViewportSize({ width: 375, height: 812 })
  await page.setExtraHTTPHeaders({ 'X-Real-IP': '192.0.2.212' })
  await page.goto('/sign-in?returnTo=%2Faccount%2Fnotifications')
  await page.request.post('http://localhost:4100/__test__/restore-admin')
  await page.getByLabel('Email address').fill('admin-e2e@example.com')
  await page.getByLabel('Password').fill('bookstore-admin-test-123')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page).toHaveURL('/account/notifications')

  for (const language of ['en', 'ar', 'th', 'zh-Hans']) {
    const common = JSON.parse(
      await readFile(
        new URL(`../src/lib/i18n/locales/${language}/common.json`, import.meta.url),
        'utf8',
      ),
    ) as Record<string, string>
    for (const theme of ['light', 'dark']) {
      await page.evaluate(
        ({ language, theme }) => {
          localStorage.setItem('book-store-language', language)
          localStorage.setItem('book-store-theme', theme)
        },
        { language, theme },
      )
      for (const route of ['/account/notifications', '/admin/notifications']) {
        await page.goto(route)
        await expect(
          page.getByRole('heading', { name: common.notificationTitle, exact: true }),
        ).toBeVisible()
        await expect(page.locator('html')).toHaveAttribute('dir', language === 'ar' ? 'rtl' : 'ltr')
        await expect(page.locator('body')).not.toContainText(/common:notification|@i18n\//)
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
        ).toBe(true)
        const bell = page.getByRole('button', {
          name: new RegExp(`^${common.notificationCount.replace('{{value0}}', '\\d+')}$`),
        })
        await expect(bell).toBeVisible()
        await bell.click()
        const dialog = page.getByRole('dialog')
        await expect(dialog).toBeVisible()
        // Bounds must settle after the native Sheet entrance animation.
        await expect
          .poll(async () => {
            const box = await dialog.boundingBox()
            return (
              !!box &&
              box.x >= -1 &&
              box.y >= -1 &&
              box.x + box.width <= 376 &&
              box.y + box.height <= 813
            )
          })
          .toBe(true)
        const readAll = dialog.getByRole('button', {
          name: common.notificationReadAll,
          exact: true,
        })
        await expect(readAll).toBeVisible()
        const box = (await readAll.boundingBox())!
        expect(box.height).toBeGreaterThanOrEqual(43)
        expect(box.width).toBeGreaterThanOrEqual(43)
        expect(
          await dialog.evaluate((element) => element.scrollHeight >= element.clientHeight),
        ).toBe(true)
        await page.screenshot({
          path: `test-results/notification-${language}-${theme}-${route.startsWith('/admin') ? 'workspace' : 'storefront'}.png`,
        })
        await page.keyboard.press('Escape')
        await expect(dialog).toHaveCount(0)
        await expect(bell).toBeFocused()
      }
    }
  }
})

test('notification dialogs fit at native Chromium 200% zoom in every language and theme', async ({
  playwright,
}, info) => {
  test.skip(
    info.project.name !== 'notification-acceptance',
    'Native zoom requires playwright.notifications.config.ts without device emulation.',
  )
  test.setTimeout(120_000)
  // Keep Chromium's deeply nested profile files below Windows path limits.
  const profile = await mkdtemp(join(tmpdir(), 'notification-zoom-'))
  if (!resolve(profile).startsWith(resolve(tmpdir()) + sep))
    throw new Error('Invalid test profile cleanup path')
  await mkdir(join(profile, 'Default'), { recursive: true })
  await writeFile(
    join(profile, 'Default', 'Preferences'),
    JSON.stringify({ partition: { default_zoom_level: { x: Math.log(2) / Math.log(1.2) } } }),
  )
  const context = await playwright.chromium.launchPersistentContext(profile, {
    channel:
      process.env.NOTIFICATION_BROWSER_CHANNEL ??
      (process.platform === 'win32' ? 'msedge' : 'chromium'),
    headless: true,
    viewport: null,
    args: ['--window-size=1280,1000', '--force-device-scale-factor=1'],
    extraHTTPHeaders: { 'X-Real-IP': '192.0.2.213' },
  })
  try {
    const origin = 'http://localhost:4173'
    await context.request.post('http://localhost:4100/__test__/restore-admin')
    const login = await context.request.post(`${origin}/api/auth/sign-in/email`, {
      headers: { Origin: origin },
      data: { email: 'admin-e2e@example.com', password: 'bookstore-admin-test-123' },
    })
    expect(login.ok()).toBe(true)
    const page = context.pages()[0]!
    await page.goto(origin)
    const cdp = await context.newCDPSession(page)
    const metrics = await cdp.send('Page.getLayoutMetrics')
    expect(metrics.cssVisualViewport.zoom).toBe(2)
    await cdp.detach()
    for (const language of ['en', 'ar', 'th', 'zh-Hans']) {
      const common = JSON.parse(
        await readFile(
          new URL(`../src/lib/i18n/locales/${language}/common.json`, import.meta.url),
          'utf8',
        ),
      ) as Record<string, string>
      for (const theme of ['light', 'dark']) {
        await page.evaluate(
          ({ language, theme }) => {
            localStorage.setItem('book-store-language', language)
            localStorage.setItem('book-store-theme', theme)
          },
          { language, theme },
        )
        for (const route of ['/account/notifications', '/admin/notifications']) {
          await page.goto(origin + route)
          await expect(
            page.getByRole('heading', { name: common.notificationTitle, exact: true }),
          ).toBeVisible()
          expect(
            await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
          ).toBe(true)
          const bell = page.getByRole('button', {
            name: new RegExp(`^${common.notificationCount.replace('{{value0}}', '\\d+')}$`),
          })
          await bell.click()
          const dialog = page.getByRole('dialog')
          await expect(dialog).toBeVisible()
          await expect
            .poll(() =>
              dialog.evaluate((element) => {
                const box = element.getBoundingClientRect()
                return (
                  box.x >= -1 &&
                  box.y >= -1 &&
                  box.right <= innerWidth + 1 &&
                  box.bottom <= innerHeight + 1
                )
              }),
            )
            .toBe(true)
          await dialog
            .getByRole('button', { name: common.notificationReadAll, exact: true })
            .scrollIntoViewIfNeeded()
          await expect(
            dialog.getByRole('button', { name: common.notificationReadAll, exact: true }),
          ).toBeInViewport()
          await page.screenshot({
            path: info.outputPath(
              `${language}-${theme}-${route.startsWith('/admin') ? 'workspace' : 'storefront'}-zoom.png`,
            ),
          })
          await page.keyboard.press('Escape')
          await expect(dialog).toHaveCount(0)
          await expect(bell).toBeFocused()
        }
      }
    }
  } finally {
    await context.close()
    await rm(profile, { recursive: true, force: true })
  }
})
