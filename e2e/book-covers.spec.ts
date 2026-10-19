import { expect, test, chromium } from '@playwright/test'
import { resolve } from 'node:path'
import { readFile, mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

test('staff cover upload persists across catalog, detail and bag, and supports replacement/removal', async ({
  page,
  browser,
}) => {
  await page.setExtraHTTPHeaders({ 'X-Real-IP': '192.0.2.213' })
  await page.goto('/sign-in?returnTo=/admin/books/new')
  await page.getByLabel('Email address').fill('admin-e2e@example.com')
  await page.getByLabel('Password').fill('bookstore-admin-test-123')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Add book', exact: true })).toBeVisible()
  await page.getByLabel('Title', { exact: true }).fill('Cover journey book')
  await page.getByLabel('Author', { exact: true }).fill('Cover Author')
  await page.getByLabel('Genre', { exact: true }).fill('Cover Genre')
  await page.getByLabel('Description', { exact: true }).fill('A book with original cover artwork.')
  await page.getByLabel('Price (USD)').fill('12.34')
  await page.getByLabel('Initial stock').fill('4')
  await page.getByRole('button', { name: 'Save book', exact: true }).click()
  await expect(page).toHaveURL(/\/admin\/books\/\d+\/edit$/)
  await expect(page.getByText('Book created. You can now add a cover.')).toBeVisible()
  const editUrl = page.url(),
    id = /books\/(\d+)/.exec(editUrl)![1]
  await page.getByLabel('Title', { exact: true }).fill('Unsaved title remains')
  await page
    .getByLabel('Choose cover image')
    .setInputFiles(resolve('../backend/seed-assets/covers/the-great-gatsby.webp'))
  await expect(page.getByAltText('Selected cover for Cover journey book')).toBeVisible()
  await page.getByRole('button', { name: 'Upload cover', exact: true }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Cover saved.' })).toBeVisible()
  await expect(page.getByLabel('Title', { exact: true })).toHaveValue('Unsaved title remains')
  const firstUrl = await page.getByAltText('Cover of Cover journey book').getAttribute('src')
  await page.reload()
  await expect(page.getByAltText('Cover of Cover journey book')).toHaveAttribute('src', firstUrl!)
  const customer = await browser.newContext(),
    store = await customer.newPage()
  try {
    await store.goto(`/books?search=${encodeURIComponent('Cover journey book')}`)
    const cardImage = store.locator(`img[src="${firstUrl}"]`)
    await expect(cardImage).toHaveCount(1)
    await store.goto(`/books/${id}`)
    const detail = store.getByAltText('Cover of Cover journey book')
    await expect(detail).toBeVisible()
    expect(await detail.evaluate((img: HTMLImageElement) => img.naturalWidth > 0)).toBe(true)
    await store.getByRole('button', { name: /Add to bag/i }).click()
    await store.goto('/cart')
    await expect(store.locator(`img[src="${firstUrl}"]`)).toBeVisible()
    const persisted = await store.evaluate(() => localStorage.getItem('book-store-cart'))
    expect(persisted).not.toContain('cover')
    // A separate API origin exercises real credentialed browser CORS/preflight.
    await page.setExtraHTTPHeaders({})
    const artworkBytes = [
      ...(await readFile(resolve('../backend/seed-assets/covers/the-secret-garden.webp'))),
    ]
    expect(
      await page.evaluate(
        async ({ id, bytes }) => {
          const response = await fetch(`http://localhost:4100/api/books/${id}/cover`, {
            method: 'PUT',
            credentials: 'include',
            headers: { 'Content-Type': 'image/webp', 'If-Match': '"1"' },
            body: new Uint8Array(bytes),
          })
          return response.status
        },
        { id, bytes: artworkBytes },
      ),
    ).toBe(200)
    await page
      .getByLabel('Choose cover image')
      .setInputFiles(resolve('../backend/seed-assets/covers/the-secret-garden.webp'))
    await page.getByRole('button', { name: 'Replace cover', exact: true }).click()
    await expect(page.getByRole('alert')).toContainText('changed elsewhere')
    await page.getByRole('button', { name: 'Replace cover', exact: true }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Cover saved.' })).toBeVisible()
    await expect(page.getByAltText('Cover of Cover journey book')).not.toHaveAttribute(
      'src',
      firstUrl!,
    )
    await page.setViewportSize({ width: 390, height: 844 })
    await page.screenshot({ path: 'test-results/book-cover-mobile.png', fullPage: true })
    await page.getByRole('button', { name: 'Remove cover', exact: true }).click()
    await page.getByRole('button', { name: 'Keep cover', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Remove cover', exact: true })).toBeFocused()
    await page.getByRole('button', { name: 'Remove cover', exact: true }).click()
    await page.getByRole('button', { name: 'Confirm remove', exact: true }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Cover removed.' })).toBeVisible()
    await expect(page.getByLabel('Choose cover image')).toBeFocused()
    await store.goto(`/books/${id}`)
    await expect(
      store.getByRole('img', { name: 'Cover design for Cover journey book' }),
    ).toBeVisible()
    // Chromium's real default browser zoom preference, not CSS zoom or pinch emulation.
    const zoomProfile = await mkdtemp(join(tmpdir(), 'book-cover-zoom-'))
    let zoomBrowser: Awaited<ReturnType<typeof chromium.launchPersistentContext>> | undefined
    try {
      await mkdir(join(zoomProfile, 'Default'))
      await writeFile(
        join(zoomProfile, 'Default', 'Preferences'),
        JSON.stringify({ partition: { default_zoom_level: { x: Math.log(2) / Math.log(1.2) } } }),
      )
      zoomBrowser = await chromium.launchPersistentContext(zoomProfile, {
        channel:
          process.env.E2E_ZOOM_BROWSER_CHANNEL ??
          (process.platform === 'win32' ? 'msedge' : 'chromium'),
        headless: true,
        viewport: null,
        deviceScaleFactor: undefined,
        args: ['--window-size=1280,1000'],
      })
      const zoomPage = await zoomBrowser.newPage()
      await zoomPage.goto(editUrl)
      await zoomPage.getByLabel('Email address').fill('admin-e2e@example.com')
      await zoomPage.getByLabel('Password').fill('bookstore-admin-test-123')
      await zoomPage.getByRole('button', { name: 'Sign in', exact: true }).click()
      await expect(zoomPage.getByRole('heading', { name: 'Book cover', exact: true })).toBeVisible()
      const metrics = await zoomPage.evaluate(() => ({
        scale: devicePixelRatio,
        width: innerWidth,
        content: document.documentElement.scrollWidth,
      }))
      expect(metrics.scale).toBeCloseTo(2, 1)
      expect(metrics.width).toBeLessThanOrEqual(640)
      expect(metrics.content).toBeLessThanOrEqual(metrics.width)
      await zoomPage.screenshot({
        path: 'test-results/book-cover-browser-zoom-200.png',
        fullPage: true,
      })
    } finally {
      await zoomBrowser?.close()
      await rm(zoomProfile, { recursive: true, force: true })
    }
  } finally {
    await customer.close()
  }
})
