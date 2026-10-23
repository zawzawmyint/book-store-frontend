import { expect, test } from '@playwright/test'
import { setAppearance } from './preferences'

test('homepage discovery, catalog navigation, and guest bag work together', async ({ page }) => {
  await page.goto('/')
  const navigation = page.getByRole('navigation', { name: 'Main navigation' })
  await expect(page.getByRole('combobox', { name: 'Search the store', exact: true })).toHaveCount(0)
  const shelf = page.getByRole('region', { name: 'Selected for your shelf' })
  await expect(shelf.getByRole('article')).toHaveCount(4)
  await expect(page.getByRole('button', { name: 'Next', exact: true })).toHaveCount(0)
  await shelf.getByRole('button', { name: 'Add to bag', exact: true }).first().click()
  await expect(page.getByRole('link', { name: 'Bag with 1 item', exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'Discover this book', exact: true }).click()
  await expect(page).toHaveURL(/\/books\/1$/)
  await expect(navigation.getByRole('link', { name: 'All books', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  )
  await page.getByRole('link', { name: 'The Quiet Shelf home', exact: true }).click()
  await page.getByRole('link', { name: 'Fantasy', exact: true }).click()
  await expect(page).toHaveURL('/books?genre=Fantasy')
  await expect(page.getByRole('heading', { name: 'All books', exact: true })).toBeVisible()
  await expect(page.getByRole('textbox', { name: 'Search books', exact: true })).toHaveValue('')
  await page.reload()
  await expect(page.getByRole('textbox', { name: 'Search books', exact: true })).toHaveValue('')
  await page.getByRole('link', { name: 'Bag with 1 item', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Your bag', exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'Continue browsing', exact: true }).click()
  await expect(page).toHaveURL('/books')
})

test('hero and shelf retain editorial books after catalog IDs change', async ({ page }) => {
  await page.setExtraHTTPHeaders({ 'X-Real-IP': '192.0.2.238' })
  await page.goto('/sign-in?returnTo=%2Fadmin%2Fbooks')
  await page.getByLabel('Email address').fill('admin-e2e@example.com')
  await page.getByLabel('Password').fill('bookstore-admin-test-123')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page).toHaveURL('/admin/books')
  const originals: { id: string; archived: boolean }[] = []
  const replacements: string[] = []
  async function graphql(query: string, variables: Record<string, unknown>) {
    const response = await page.request.post('/graphql', {
      headers: { Origin: 'http://localhost:4173' },
      data: { query, variables },
    })
    expect(response.ok()).toBe(true)
    const body = await response.json()
    expect(body.errors).toBeUndefined()
    return body.data
  }
  async function archive(id: string, archived: boolean) {
    await graphql(
      'mutation($id:ID!,$archived:Boolean!){setBookArchived(id:$id,archived:$archived){id}}',
      { id, archived },
    )
  }
  try {
    for (const [id, title, author] of [
      ['1', 'ＴＨＥ Great   Gatsby', 'F. Scott Fitzgerald'],
      ['2', 'Pride and Prejudice', 'Jane Austen'],
      ['4', 'Jane Eyre', 'Charlotte Brontë'],
      ['8', 'A Room with a View', 'E. M. Forster'],
    ]) {
      const { adminBook: original } = await graphql(
        'query($id:ID!){adminBook(id:$id){id archived title author genre description priceCents stock}}',
        { id },
      )
      originals.push({ id, archived: original.archived })
      const { createBook: replacement } = await graphql(
        'mutation($input:CreateBookInput!){createBook(input:$input){id}}',
        {
          input: {
            details: {
              title,
              author,
              genre: original.genre,
              description: original.description,
              priceCents: original.priceCents,
            },
            stock: original.stock,
          },
        },
      )
      replacements.push(replacement.id)
      await archive(id, true)
    }
    await page.goto('/')
    const shelf = page.getByRole('region', { name: 'Selected for your shelf' })
    await expect(shelf.getByRole('article')).toHaveCount(4)
    const hero = page.locator('.home-hero')
    await expect(hero.getByRole('link', { name: /Featured book:/ })).toHaveAttribute(
      'href',
      `/books/${replacements[0]}`,
    )
    await expect(
      page.getByRole('link', { name: 'Discover this book', exact: true }),
    ).toHaveAttribute('href', `/books/${replacements[0]}`)
    const shelfIds = await shelf
      .getByRole('article')
      .evaluateAll((articles) =>
        articles.map((article) =>
          article.querySelector('a[href^="/books/"]')?.getAttribute('href'),
        ),
      )
    expect(shelfIds).toEqual(replacements.map((id) => `/books/${id}`))
    await page.reload()
    await expect(shelf.getByRole('article')).toHaveCount(4)
    await expect(hero.getByRole('link', { name: /Featured book:/ })).toHaveAttribute(
      'href',
      `/books/${replacements[0]}`,
    )
    for (const id of replacements) await archive(id, true)
    await page.reload()
    await expect(shelf.getByRole('article')).toHaveCount(4)
    const fallbackLinks = await shelf
      .getByRole('article')
      .evaluateAll((articles) =>
        articles.map((article) =>
          article.querySelector('a[href^="/books/"]')?.getAttribute('href'),
        ),
      )
    expect(new Set(fallbackLinks).size).toBe(4)
    await expect(hero.getByRole('link', { name: /Featured book:/ })).toHaveAttribute(
      'href',
      fallbackLinks[0]!,
    )
    await expect(page.getByRole('link', { name: 'Discover this book', exact: true })).toHaveCount(0)
  } finally {
    for (const original of originals) await archive(original.id, original.archived)
    for (const id of replacements) await archive(id, true)
  }
})

test('header search and old catalog links preserve navigation state', async ({
  page,
}, testInfo) => {
  await page.goto('/cart')
  const searchTrigger = page.getByRole('button', { name: 'Open store search', exact: true })
  await expect(page.getByRole('combobox', { name: 'Search the store', exact: true })).toHaveCount(0)
  await searchTrigger.click()
  await expect(page.getByRole('combobox', { name: 'Search the store', exact: true })).toBeFocused()
  await page.screenshot({ path: testInfo.outputPath('search-dialog.png') })
  await page.keyboard.press('Escape')
  await expect(searchTrigger).toBeFocused()
  await searchTrigger.click()
  await page.getByRole('combobox', { name: 'Search the store', exact: true }).fill('  Jane  ')
  await page.getByRole('combobox', { name: 'Search the store', exact: true }).press('Enter')
  await expect(page).toHaveURL('/books?search=Jane')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await searchTrigger.click()
  await page.getByRole('combobox', { name: 'Search the store', exact: true }).fill('Gatsby')
  await page.getByRole('combobox', { name: 'Search the store', exact: true }).press('Enter')
  await expect(page.getByRole('textbox', { name: 'Search books', exact: true })).toHaveValue(
    'Gatsby',
  )
  await searchTrigger.click()
  await page.getByRole('combobox', { name: 'Search the store', exact: true }).fill('   ')
  await page.getByRole('combobox', { name: 'Search the store', exact: true }).press('Enter')
  await expect(page).toHaveURL('/books')
  await searchTrigger.click()
  await page.getByRole('button', { name: 'Close dialog', exact: true }).click()
  await expect(searchTrigger).toBeFocused()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.goto('/?search=Jane&page=0&extra=yes#collection')
  await expect(page).toHaveURL('/books?search=Jane&extra=yes')
  await page.goto('/#collection')
  await expect(page).toHaveURL('/books')
  await page.goto('/?campaign=autumn')
  await expect(
    page.getByRole('region', { name: 'Selected for your shelf' }).getByRole('article'),
  ).toHaveCount(4)
  await expect(page).toHaveURL('/?campaign=autumn')
})

test('home and catalog fit mobile and desktop in both themes', async ({ page }, testInfo) => {
  await page.goto('/')
  await expect(
    page.getByRole('region', { name: 'Selected for your shelf' }).getByRole('article'),
  ).toHaveCount(4)
  await page.evaluate(() => document.fonts.ready)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const width of [1440, 320]) {
    await page.setViewportSize({ width, height: width === 320 ? 780 : 1000 })
    for (const mode of ['light', 'dark']) {
      await setAppearance(page, mode as 'light' | 'dark')
      await expect(page.locator('h1')).toHaveCount(1)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      )
      await page.evaluate(() =>
        Promise.all(
          document.getAnimations().map((animation) => animation.finished.catch(() => {})),
        ),
      )
      await page.screenshot({
        path: testInfo.outputPath(`homepage-${width}-${mode}.png`),
        fullPage: true,
        animations: 'disabled',
      })
    }
  }
  await page.getByRole('button', { name: 'Open navigation', exact: true }).click()
  await page.screenshot({ path: testInfo.outputPath('mobile-navigation.png') })
  await page.getByRole('dialog').getByRole('link', { name: 'All books', exact: true }).click()
  await expect(page).toHaveURL('/books')
  await page.getByRole('button', { name: 'Open store search', exact: true }).click()
  await expect(page.getByRole('combobox', { name: 'Search the store', exact: true })).toBeFocused()
  await page.keyboard.type('Gatsby')
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL('/books?search=Gatsby')
  await expect(page.locator('h1')).toHaveCount(1)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath('catalog-320-dark.png'), fullPage: true })
})

test('reading moods and author discovery open useful catalog searches', async ({ page }) => {
  await page.goto('/')
  const moods = page.getByRole('region', { name: 'Find your reading mood' })
  await moods.getByRole('link', { name: /A little adventure/ }).click()
  await expect(page).toHaveURL('/books?genre=Adventure')
  await page.getByRole('link', { name: 'The Quiet Shelf home', exact: true }).click()
  const author = page.getByRole('region', { name: 'Explore an author' })
  await expect(author).toContainText('F. Scott Fitzgerald')
  await author.getByRole('link', { name: /Explore books by/ }).click()
  await expect(page).toHaveURL('/books?search=F.+Scott+Fitzgerald')
})
