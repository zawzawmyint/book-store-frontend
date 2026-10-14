import { expect, test, type APIRequestContext } from '@playwright/test'

test('catalog header scrolls away while other storefront routes retain a sticky header', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/books/?sort=title-asc')
  await expect(page.getByRole('article').first()).toBeVisible()
  await page.evaluate(() => window.scrollTo(0, 700))
  const header = page.locator('header').first()
  await expect
    .poll(async () => {
      const bounds = await header.boundingBox()
      return bounds!.y + bounds!.height
    })
    .toBeLessThanOrEqual(0)
  const sidebar = page.getByRole('complementary', { name: 'Catalog filters' })
  await expect.poll(async () => (await sidebar.boundingBox())!.y).toBeCloseTo(24, 0)
  await page.getByRole('link', { name: 'The Quiet Shelf home' }).click()
  await expect(page).toHaveURL('/')
  await page.evaluate(() => window.scrollTo(0, 700))
  await expect.poll(async () => (await header.boundingBox())!.y).toBeCloseTo(0, 0)
})

async function graphql(
  request: APIRequestContext,
  query: string,
  variables: Record<string, unknown> = {},
) {
  const response = await request.post('/graphql', {
    headers: { Origin: 'http://localhost:4173' },
    data: { query, variables },
  })
  expect(response.ok()).toBe(true)
  const result = await response.json()
  expect(result.errors).toBeUndefined()
  return result.data
}

test('catalog combines filters, price sorting, pagination, bag feedback, and detail return', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.setExtraHTTPHeaders({ 'X-Real-IP': '192.0.2.201' })
  const signin = await page.request.post('/api/auth/sign-in/email', {
    headers: { Origin: 'http://localhost:4173', 'X-Real-IP': '192.0.2.201' },
    data: { email: 'admin-e2e@example.com', password: 'bookstore-admin-test-123' },
  })
  expect(signin.ok()).toBe(true)
  const ids: string[] = []
  try {
    for (let index = 0; index < 14; index++) {
      const data = await graphql(
        page.request,
        'mutation($input: CreateBookInput!) { createBook(input: $input) { id } }',
        {
          input: {
            details: {
              title: `Catalog journey ${String(index).padStart(2, '0')}`,
              author: 'Journey Author',
              genre: 'Catalog Journey',
              description: 'Isolated catalog fixture',
              priceCents: 1000 + index * 100,
            },
            stock: index === 13 ? 0 : 15,
          },
        },
      )
      ids.push(data.createBook.id)
    }
    await page.context().clearCookies()
    await page.goto('/books?genre=Catalog+Journey')
    const filters = page.getByRole('complementary', { name: 'Catalog filters' })
    await expect(filters).toBeVisible()
    await expect(filters.getByRole('heading', { name: 'All books', exact: true })).toBeVisible()
    await expect(filters.getByRole('textbox', { name: 'Search books', exact: true })).toBeVisible()
    await expect(filters.getByLabel('Sort by')).toBeVisible()
    await expect(page.getByText('Showing 1–12 of 14 books')).toBeVisible()
    await page.getByRole('textbox', { name: 'Search books', exact: true }).fill('Journey Author')
    await page.getByRole('button', { name: 'Search books', exact: true }).click()
    await expect(page).toHaveURL('/books?search=Journey+Author&genre=Catalog+Journey')
    await page.getByLabel('Sort by').selectOption('price-desc')
    await expect(
      page
        .getByRole('article')
        .first()
        .getByRole('link', { name: 'View Catalog journey 13', exact: true }),
    ).toBeVisible()
    await filters.getByLabel('In stock only').click()
    await expect(filters.getByLabel('In stock only')).toBeChecked()
    await filters.getByLabel('Min price', { exact: true }).fill('10.00')
    await filters.getByLabel('Max price', { exact: true }).fill('22.00')
    await filters.getByRole('button', { name: 'Apply', exact: true }).click()
    await expect(page.getByText('Showing 1–12 of 13 books')).toBeVisible()
    await expect(
      page
        .getByRole('article')
        .first()
        .getByRole('link', { name: 'View Catalog journey 12', exact: true }),
    ).toBeVisible()
    await page.getByRole('button', { name: 'Next', exact: true }).click()
    await expect(page.getByText('Showing 13–13 of 13 books')).toBeVisible()
    await expect(page.getByText('Page 2 of 2', { exact: true })).toBeVisible()
    const paginated = page.url()
    await page.reload()
    await expect(page.getByText('Page 2 of 2', { exact: true })).toBeVisible()
    await page.getByRole('link', { name: 'View Catalog journey 00', exact: true }).click()
    await page.getByRole('main').getByRole('link', { name: 'All books', exact: true }).click()
    await expect(page).toHaveURL(paginated)
    await page.getByRole('button', { name: 'Previous', exact: true }).click()
    await expect(page.getByText('Page 1 of 2', { exact: true })).toBeVisible()
    const catalog = page.url()
    await page.evaluate(() => document.fonts.ready)
    const card = page.getByRole('article').nth(7)
    await card.scrollIntoViewIfNeeded()
    const y = await page.evaluate(() => scrollY)
    expect(y).toBeGreaterThan(200)
    await card.getByRole('link', { name: 'View Catalog journey 05', exact: true }).click()
    await page.goBack()
    await expect(page).toHaveURL(catalog)
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(y - 10)
    await card.getByRole('button', { name: 'Add to bag', exact: true }).click()
    await expect(card.getByRole('link', { name: 'View bag', exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Remove price range filter' }).click()
    await expect(page).not.toHaveURL(/minPrice|maxPrice/)
    await page.getByRole('button', { name: 'Clear all', exact: true }).click()
    await expect(page).toHaveURL('/books')
  } finally {
    await page.request.post('/api/auth/sign-in/email', {
      headers: { Origin: 'http://localhost:4173', 'X-Real-IP': '192.0.2.202' },
      data: { email: 'admin-e2e@example.com', password: 'bookstore-admin-test-123' },
    })
    for (const id of ids)
      await graphql(
        page.request,
        'mutation($id: ID!) { setBookArchived(id: $id, archived: true) { id } }',
        { id },
      )
  }
})

test('mobile filters validate drafts, discard dismissal, apply once, and fit both themes', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 375, height: 800 })
  await page.goto('/books')
  await expect(page.getByRole('article').first()).toBeVisible()
  const trigger = page.getByRole('button', { name: 'Filter & sort', exact: true })
  await trigger.click()
  const drawer = page.getByRole('dialog', { name: 'Filter & sort', exact: true })
  await drawer.getByLabel('Sort by').selectOption('price-desc')
  await drawer.getByLabel('Min price', { exact: true }).fill('20')
  await drawer.getByLabel('Max price', { exact: true }).fill('10')
  await drawer.getByRole('button', { name: 'Apply', exact: true }).click()
  await expect(drawer.getByRole('alert')).toHaveText(/Min price/)
  await expect(page).toHaveURL('/books')
  await page.keyboard.press('Escape')
  await expect(trigger).toBeFocused()
  await trigger.click()
  await expect(drawer.getByLabel('Sort by')).toHaveValue('default')
  await drawer.getByLabel('Sort by').selectOption('title-asc')
  await expect(drawer.getByLabel('Min price', { exact: true })).toHaveValue('')
  await drawer.getByLabel('Max price', { exact: true }).fill('15.50')
  await drawer.getByLabel('In stock only').check()
  await drawer.getByRole('button', { name: 'Apply', exact: true }).click()
  await expect(drawer).toHaveCount(0)
  await expect(page).toHaveURL('/books?sort=title-asc&inStock=1&maxPrice=1550')
  await page.getByRole('button', { name: 'Clear all', exact: true }).click()
  await page.evaluate(() => document.fonts.ready)
  for (const width of [320, 375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    for (const theme of ['light', 'dark']) {
      await page.evaluate((mode) => {
        localStorage.setItem('book-store-theme', mode)
      }, theme)
      await page.reload()
      await expect(page.getByRole('article').first()).toBeVisible()
      await page.evaluate(() => document.fonts.ready)
      await page.evaluate(() => window.scrollTo(0, 0))
      await page.getByRole('textbox', { name: 'Search books', exact: true }).focus()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      )
      await page.screenshot({
        path: testInfo.outputPath(`catalog-${width}-${theme}.png`),
        fullPage: false,
      })
    }
  }
  await page.setViewportSize({ width: 1440, height: 360 })
  await page.evaluate(() => window.scrollTo(0, 700))
  const sidebar = page.getByRole('complementary', { name: 'Catalog filters' })
  const apply = sidebar.getByRole('button', { name: 'Apply', exact: true })
  await apply.focus()
  await expect(apply).toBeFocused()
  const header = await page.locator('header').first().boundingBox()
  const bounds = await apply.boundingBox()
  expect(bounds!.y).toBeGreaterThanOrEqual(header!.y + header!.height)
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(360)
  await page.screenshot({ path: testInfo.outputPath('catalog-short-desktop.png') })
})
