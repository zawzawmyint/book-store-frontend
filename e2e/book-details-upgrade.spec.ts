import { randomUUID } from 'node:crypto'
import { expect, test, type Page } from '@playwright/test'
import { capturedEmailLink } from './auth-email-helpers'

const addButton = (page: Page) =>
  page
    .getByRole('form', { name: 'Book purchase' })
    .getByRole('button', { name: 'Add to bag', exact: true })
    .first()

test('guest selects copies, reaches the cap, and retains quantity after reload', async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/books/1')
  await expect(page.getByLabel('Quantity', { exact: true })).toBeVisible()
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: info.outputPath('book-details-desktop.png') })
  await page.getByLabel('Quantity', { exact: true }).selectOption('3')
  await addButton(page).click()
  await expect(page.getByText('Added 3 to your bag', { exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Bag with 3 items', exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByText('Added 3 to your bag', { exact: true })).toHaveCount(0)
  await expect(page.getByLabel('Quantity', { exact: true })).toHaveValue('1')
  await page.getByLabel('Quantity', { exact: true }).selectOption('7')
  await addButton(page).click()
  await expect(page.getByText('Added 7 to your bag', { exact: true })).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Maximum in bag', exact: true }).first(),
  ).toBeDisabled()
  await expect(page.getByLabel('Quantity', { exact: true })).toBeDisabled()
  await page
    .getByRole('link', { name: /View bag/ })
    .first()
    .click()
  const cart = await page.request.post('/graphql', {
    data: { query: '{ book(id:"1") { stock } }' },
    headers: { Origin: 'http://localhost:4173' },
  })
  expect((await cart.json()).data.book.stock).toBeGreaterThanOrEqual(10)
  await expect(page.getByRole('link', { name: 'Bag with 10 items', exact: true })).toBeVisible()
})

test('related details preserve catalog context and genre/author links start fresh searches', async ({
  page,
}) => {
  const catalog = '/books?genre=Classic+Fiction&sort=title-asc&inStock=1'
  await page.goto(catalog)
  const link = page.getByRole('link', { name: 'View The Great Gatsby', exact: true })
  await link.scrollIntoViewIfNeeded()
  const position = await page.evaluate(() => scrollY)
  await link.click()
  const related = page.getByRole('region', { name: 'More in this genre' })
  await expect(related.getByRole('article')).toHaveCount(4)
  await expect(
    related.getByRole('link', { name: 'View The Great Gatsby', exact: true }),
  ).toHaveCount(0)
  await related.getByRole('link', { name: 'View Pride and Prejudice', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'Pride and Prejudice', exact: true }),
  ).toBeInViewport()
  expect(await page.evaluate(() => scrollY)).toBeLessThan(10)
  await expect(
    page.getByRole('heading', { name: 'Pride and Prejudice', exact: true }),
  ).toBeVisible()
  await expect(page.getByLabel('Quantity', { exact: true })).toHaveValue('1')
  await page.getByRole('main').getByRole('link', { name: 'All books', exact: true }).click()
  await expect(page).toHaveURL(catalog)
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThanOrEqual(position - 10)
  await page.goto('/books/1')
  await page.getByRole('main').getByRole('link', { name: 'Classic Fiction', exact: true }).click()
  await expect(page).toHaveURL('/books?genre=Classic+Fiction')
  await page.goto('/books/1')
  await page
    .getByRole('main')
    .getByRole('link', { name: /F\. Scott Fitzgerald/ })
    .click()
  await expect(page).toHaveURL('/books?search=F.+Scott+Fitzgerald')
})

test('an unconfirmed account quantity save retries once with its original key', async ({
  page,
}) => {
  const email = `detail-${randomUUID()}@example.com`
  const password = 'bookstore-details-test-123'
  const headers = { Origin: 'http://localhost:4173', 'X-Real-IP': '192.0.2.220' }
  await page.goto('/')
  const signup = await page.request.post('/api/auth/sign-up/email', {
    headers,
    data: { name: 'Detail shopper', email, password },
  })
  expect(signup.ok()).toBe(true)
  await page.request.get(await capturedEmailLink(page, email))
  const login = await page.request.post('/api/auth/sign-in/email', {
    headers,
    data: { email, password },
  })
  expect(login.ok()).toBe(true)
  const writes: { quantity: number; requestKey: string }[] = []
  let release!: () => void
  const held = new Promise<void>((resolve) => {
    release = resolve
  })
  await page.route('**/graphql', async (route) => {
    const body = route.request().postDataJSON()
    if (body.query?.includes('setCartItem')) {
      writes.push(body.variables.input)
      if (writes.length === 1) {
        await held
        await route.fetch()
        await route.abort('failed')
        return
      }
    }
    await route.continue()
  })
  await page.goto('/books/1')
  await expect(addButton(page)).toBeEnabled()
  await page.getByLabel('Quantity', { exact: true }).selectOption('3')
  await addButton(page).click()
  await expect(page.getByRole('button', { name: 'Adding…', exact: true })).toBeDisabled()
  await expect(page.getByText('Added 3 to your bag', { exact: true })).toHaveCount(0)
  release()
  await page.getByRole('button', { name: 'Retry save', exact: true }).click()
  await expect(page.getByRole('link', { name: 'Bag with 3 items', exact: true })).toBeVisible()
  expect(writes.map(({ quantity }) => quantity)).toEqual([3, 3])
  expect(writes[0].requestKey).toBe(writes[1].requestKey)
  await expect(page.getByText('Added 3 to your bag', { exact: true })).toHaveCount(0)
  await page.getByLabel('Quantity', { exact: true }).selectOption('2')
  await addButton(page).click()
  await expect(page.getByText('Added 2 to your bag', { exact: true })).toBeVisible()
  expect(writes.map(({ quantity }) => quantity)).toEqual([3, 3, 5])
})

test('related query failures do not prevent buying the main book', async ({ page }) => {
  await page.route('**/graphql', async (route) => {
    if (route.request().postDataJSON().query?.includes('query RelatedBooks')) {
      await route.fulfill({ json: { errors: [{ message: 'Related shelf unavailable' }] } })
    } else await route.continue()
  })
  await page.goto('/books/1')
  await expect(page.getByRole('heading', { name: 'The Great Gatsby', exact: true })).toBeVisible()
  await page.getByLabel('Quantity', { exact: true }).selectOption('2')
  await addButton(page).click()
  await expect(page.getByText('Added 2 to your bag', { exact: true })).toBeVisible()
})

test('sold-out and low-stock details expose accurate purchase limits', async ({ page }) => {
  let stock = 0
  await page.route('**/graphql', async (route) => {
    if (/query (Book\(|RelatedBooks)/.test(route.request().postDataJSON().query ?? '')) {
      const response = await route.fetch()
      const body = await response.json()
      if (body.data.book) body.data.book.stock = stock
      for (const book of body.data.books?.items ?? []) if (book.id === '1') book.stock = stock
      await route.fulfill({ json: body })
    } else await route.continue()
  })
  await page.goto('/books/1')
  await expect(page.getByRole('button', { name: 'Sold out', exact: true }).first()).toBeDisabled()
  await expect(page.getByLabel('Quantity', { exact: true })).toBeDisabled()
  stock = 2
  await page.reload()
  await expect(page.getByLabel('Quantity', { exact: true }).getByRole('option')).toHaveCount(2)
  await page.getByLabel('Quantity', { exact: true }).selectOption('2')
  await addButton(page).click()
  await expect(page.getByText('Added 2 to your bag', { exact: true })).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Maximum in bag', exact: true }).first(),
  ).toBeDisabled()
})

test('book details and purchase controls fit both themes at narrow and wide widths', async ({
  page,
}, info) => {
  await page.route('**/graphql', async (route) => {
    if (/query (Book\(|RelatedBooks)/.test(route.request().postDataJSON().query ?? '')) {
      const response = await route.fetch()
      const body = await response.json()
      const books = body.data.book ? [body.data.book] : (body.data.books?.items ?? [])
      for (const book of books) {
        if (book.id !== '1') continue
        book.title = 'AnExtraordinarilyLongBookTitleWithoutConvenientSpaces'.repeat(2)
        book.author = 'AnAuthorWithALongNameThatNeedsToWrap'.repeat(2)
        book.description =
          'First paragraph of a longer description.\n\n' +
          'A thoughtful story worth exploring. '.repeat(80)
      }
      await route.fulfill({ json: body })
    } else await route.continue()
  })
  await page.goto('/books/1')
  for (const width of [320, 375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    for (const theme of ['light', 'dark']) {
      await page.evaluate((value) => localStorage.setItem('book-store-theme', value), theme)
      await page.reload()
      await expect(page.getByLabel('Quantity', { exact: true })).toBeVisible()
      await page.evaluate(() => document.fonts.ready)
      await page.evaluate(() => window.scrollTo(0, 0))
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      )
      await page.screenshot({ path: info.outputPath(`details-${width}-${theme}.png`) })
      await page.getByLabel('Quantity', { exact: true }).focus()
      await page.keyboard.press('Tab')
      await expect(addButton(page)).toBeFocused()
      await addButton(page).scrollIntoViewIfNeeded()
      await page.screenshot({ path: info.outputPath(`details-purchase-${width}-${theme}.png`) })
    }
  }
})
