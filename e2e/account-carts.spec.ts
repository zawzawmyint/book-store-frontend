import { randomUUID } from 'node:crypto'
import { expect, test, type Page } from '@playwright/test'
import { capturedEmailLink, signInRespectingRateLimit } from './auth-email-helpers'
import { reviewDelivery } from './delivery'
import { hostedPayment } from './hosted-payment'

const password = 'bookstore-cart-test-123'
const cartFields =
  'revision items { bookId quantity title lineVersion available } mergeNotices { bookId reason }'
let registrationClient = 0

test.beforeEach(async ({ page }, info) => {
  await page.setExtraHTTPHeaders({ 'X-Real-IP': `198.51.100.${(info.line % 180) + 30}` })
})

async function register(page: Page, label: string) {
  const email = `${label}-${randomUUID()}@example.com`
  const result = await page.request.post('/api/auth/sign-up/email', {
    data: { name: `Cart ${label}`, email, password },
    headers: { Origin: 'http://localhost:4173', 'X-Real-IP': `203.0.113.${++registrationClient}` },
  })
  expect(result.ok()).toBe(true)
  await page.request.get(await capturedEmailLink(page, email))
  return email
}

async function signIn(page: Page, email: string) {
  await page.goto('/sign-in?returnTo=%2Fcart')
  await page.getByLabel('Email address').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  expect((await signInRespectingRateLimit(page)).status()).toBe(200)
  await expect(page.getByRole('heading', { name: 'Your bag', exact: true })).toBeVisible()
}

async function signOut(page: Page) {
  await page.getByRole('button', { name: 'Account', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Sign out', exact: true }).click()
  await expect(page).toHaveURL('/sign-in')
  await expect(page.getByRole('heading', { name: 'Sign in', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Sign in', exact: true })).toBeVisible()
}

async function addBook(page: Page, id: string) {
  await page.goto(`/books/${id}`)
  await page
    .getByRole('form', { name: 'Book purchase' })
    .getByRole('button', { name: 'Add to bag', exact: true })
    .click()
  await expect(page.getByRole('link', { name: /View bag/ })).toBeVisible()
  await page.getByRole('link', { name: /View bag/ }).click()
}

async function serverCart(page: Page) {
  const result = await page.request.post('/graphql', {
    headers: { Origin: 'http://localhost:4173' },
    data: { query: `{ myCart { ${cartFields} } }` },
  })
  const body = await result.json()
  expect(body.errors).toBeUndefined()
  return body.data.myCart as {
    revision: string
    items: {
      bookId: string
      quantity: number
      title: string
      lineVersion: string
      available: boolean
    }[]
  }
}

test('mobile bag keeps checkout reachable with clear line prices and comfortable controls', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await signIn(page, await register(page, 'mobile-ui'))
  await addBook(page, '1')
  await addBook(page, '2')
  const increment = page.getByRole('button', { name: 'Add one The Great Gatsby', exact: true })
  await increment.click()
  await expect(
    page.getByText('Line total for The Great Gatsby:', { exact: true }).locator('..'),
  ).toContainText('$33.98')
  await expect(page.getByText('$16.99 each', { exact: true })).toBeVisible()
  await expect.poll(async () => (await serverCart(page)).items[0].quantity).toBe(2)
  for (const name of [
    'Add one The Great Gatsby',
    'Remove one The Great Gatsby',
    'Remove The Great Gatsby from bag',
  ]) {
    const box = (await page.getByRole('button', { name, exact: true }).boundingBox())!
    expect(box.width).toBeGreaterThanOrEqual(44)
    expect(box.height).toBeGreaterThanOrEqual(44)
  }
  await page.evaluate(() => window.scrollTo(0, 0))
  const checkout = page.getByRole('link', { name: 'Continue to checkout', exact: true })
  await expect(checkout).toBeInViewport()
  const lastRemove = page.getByRole('button', {
    name: 'Remove Pride and Prejudice from bag',
    exact: true,
  })
  await lastRemove.focus()
  await expect(lastRemove).toBeFocused()
  await expect
    .poll(async () => {
      const focusedBox = (await lastRemove.boundingBox())!
      const stickyBox = (await checkout.locator('..').boundingBox())!
      return focusedBox.y + focusedBox.height - stickyBox.y
    })
    .toBeLessThanOrEqual(0)
  const barBox = (await checkout.boundingBox())!
  expect(barBox.y + barBox.height).toBeLessThanOrEqual(844)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await checkout.click()
  await expect(page.getByRole('heading', { name: 'Checkout', exact: true })).toBeVisible()
})

test('guest cart merges into A, logout hides it, B stays separate, and another browser restores A', async ({
  page,
  browser,
}) => {
  await page.goto('/')
  const accountA = await register(page, 'a')
  const accountB = await register(page, 'b')
  await addBook(page, '1')
  await page.reload()
  await expect(page.getByRole('link', { name: 'The Great Gatsby', exact: true })).toBeVisible()
  await signIn(page, accountA)
  await expect(page.getByRole('link', { name: 'The Great Gatsby', exact: true })).toBeVisible()
  await signOut(page)
  await page.goto('/cart')
  await expect(page.getByText('Nothing here yet.', { exact: true })).toBeVisible()
  await signIn(page, accountB)
  await expect(page.getByText('Nothing here yet.', { exact: true })).toBeVisible()
  await addBook(page, '2')
  await expect
    .poll(async () => (await serverCart(page)).items.map((item) => item.bookId))
    .toEqual(['2'])
  await signOut(page)
  await signIn(page, accountA)
  await expect(page.getByRole('link', { name: 'The Great Gatsby', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Pride and Prejudice', exact: true })).toHaveCount(0)
  const other = await browser.newContext()
  try {
    const device = await other.newPage()
    await device.setExtraHTTPHeaders({ 'X-Real-IP': '198.51.100.220' })
    await signIn(device, accountA)
    await expect(device.getByRole('link', { name: 'The Great Gatsby', exact: true })).toBeVisible()
    expect((await serverCart(device)).items.map((item) => item.bookId)).toEqual(['1'])
  } finally {
    await other.close()
  }
})

test('legacy shared bag requires explicit account import and account items never enter guest storage', async ({
  page,
}) => {
  await page.goto('/')
  const email = await register(page, 'legacy')
  await page.evaluate(() =>
    localStorage.setItem(
      'book-store-cart',
      JSON.stringify([
        {
          id: '1',
          title: 'The Great Gatsby',
          author: 'F. Scott Fitzgerald',
          genre: 'Classic Fiction',
          priceCents: 1699,
          stock: 12,
          quantity: 2,
        },
      ]),
    ),
  )
  await signIn(page, email)
  await expect(page.getByText('An older bag was found on this browser')).toBeVisible()
  await page.getByText('View saved books', { exact: true }).click()
  await expect(page.getByText('2 × The Great Gatsby', { exact: true })).toBeVisible()
  expect((await serverCart(page)).items).toEqual([])
  await page.getByRole('button', { name: /Add saved bag|Import saved bag/i }).click()
  await expect
    .poll(async () => (await serverCart(page)).items.map((item) => item.quantity))
    .toEqual([2])
  await expect(page.getByText('2 books', { exact: true })).toBeVisible()
  await signOut(page)
  await page.goto('/cart')
  await expect(page.getByText('Nothing here yet.', { exact: true })).toBeVisible()
  const stored = await page.evaluate(() => localStorage.getItem('book-store-cart'))
  expect(stored).not.toContain('The Great Gatsby')
})

test('lost guest merge response stays bound to A and reload retries it without doubling quantities', async ({
  page,
}) => {
  await page.goto('/')
  const accountA = await register(page, 'merge-a')
  const accountB = await register(page, 'merge-b')
  await addBook(page, '1')
  let dropped = false
  await page.route('**/graphql', async (route) => {
    if (!dropped && route.request().postDataJSON().query?.includes('mergeGuestCart')) {
      dropped = true
      await route.fetch()
      await route.abort('failed')
    } else await route.continue()
  })
  await signIn(page, accountA)
  await expect(page.getByRole('button', { name: 'Retry merge', exact: true })).toBeVisible()
  await signOut(page)
  await signIn(page, accountB)
  await expect(page.getByText('Nothing here yet.', { exact: true })).toBeVisible()
  expect((await serverCart(page)).items).toEqual([])
  await signOut(page)
  await signIn(page, accountA)
  await page.reload()
  await expect(page.getByRole('link', { name: 'The Great Gatsby', exact: true })).toBeVisible()
  expect((await serverCart(page)).items.map((item) => item.quantity)).toEqual([1])
  await expect(page.getByRole('button', { name: 'Retry merge', exact: true })).toHaveCount(0)
})

test('lost account save has an explicit same-operation retry and blocks checkout until resolved', async ({
  page,
}) => {
  await page.goto('/')
  await signIn(page, await register(page, 'save'))
  let dropped = false
  const keys: string[] = []
  await page.route('**/graphql', async (route) => {
    const body = route.request().postDataJSON()
    if (body.query?.includes('setCartItem')) {
      keys.push(body.variables.input.requestKey)
      if (!dropped) {
        dropped = true
        await route.fetch()
        await route.abort('failed')
        return
      }
    }
    await route.continue()
  })
  await page.goto('/books/1')
  await page
    .getByRole('form', { name: 'Book purchase' })
    .getByRole('button', { name: 'Add to bag', exact: true })
    .click()
  await page.getByRole('link', { name: /Bag with/ }).click()
  await expect(page.getByRole('button', { name: 'Retry save', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: /Continue to checkout/i })).toHaveCount(0)
  await page.getByRole('button', { name: 'Retry save', exact: true }).click()
  await expect(page.getByRole('link', { name: 'The Great Gatsby', exact: true })).toBeVisible()
  await expect.poll(() => keys.length).toBe(2)
  expect(keys[0]).toBe(keys[1])
  expect((await serverCart(page)).items.map((item) => item.quantity)).toEqual([1])
})

test('payment cleanup works without browser return and preserves a line edited after checkout', async ({
  page,
}) => {
  await page.goto('/')
  await signIn(page, await register(page, 'payment'))
  await addBook(page, '1')
  await hostedPayment(page, false)
  await page.goto('/checkout')
  await reviewDelivery(page)
  await page.getByRole('button', { name: 'Continue to payment', exact: true }).click()
  await expect(page).toHaveURL(/checkout\/return\/\d+/)
  const orderId = new URL(page.url()).pathname.split('/').at(-1)!
  await page.goto('/cart')
  await page.getByRole('button', { name: 'Add one The Great Gatsby', exact: true }).click()
  await expect
    .poll(async () => (await serverCart(page)).items.map((item) => item.quantity))
    .toEqual([2])
  await addBook(page, '3')
  expect((await page.request.post(`http://localhost:4100/__test__/pay/${orderId}`)).ok()).toBe(true)
  // Reconciliation is the real API path, with no payment-return page mounted.
  const paid = await page.request.post('/graphql', {
    headers: { Origin: 'http://localhost:4173' },
    data: {
      query:
        'mutation ($orderId: ID!) { refreshOrderPayment(orderId: $orderId) { payment { status } } }',
      variables: { orderId },
    },
  })
  expect((await paid.json()).data.refreshOrderPayment.payment.status).toBe('PAID')
  const saved = await serverCart(page)
  expect(saved.items.map((item) => [item.bookId, item.quantity])).toEqual([
    ['1', 2],
    ['3', 1],
  ])
  await page.reload()
  await expect(page.getByRole('link', { name: 'The Great Gatsby', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'The Secret Garden', exact: true })).toBeVisible()
})

test('a stale edit reloads the server cart rather than overwriting another device', async ({
  page,
}) => {
  await page.goto('/')
  await signIn(page, await register(page, 'conflict'))
  await addBook(page, '1')
  await expect
    .poll(async () => (await serverCart(page)).items.map((item) => item.quantity))
    .toEqual([1])
  const current = await serverCart(page)
  let release: (() => void) | undefined
  await page.route('**/graphql', async (route) => {
    if (route.request().postDataJSON().query?.includes('setCartItem')) {
      await new Promise<void>((resolve) => {
        release = resolve
      })
    }
    await route.continue()
  })
  await page.getByRole('button', { name: 'Add one The Great Gatsby', exact: true }).click()
  await expect.poll(() => !!release).toBe(true)
  const changedElsewhere = await page.request.post('/graphql', {
    headers: { Origin: 'http://localhost:4173' },
    data: {
      query: `mutation ($input: SetCartItemInput!) { setCartItem(input: $input) { ${cartFields} } }`,
      variables: {
        input: {
          bookId: '1',
          quantity: 3,
          expectedRevision: current.revision,
          requestKey: randomUUID(),
        },
      },
    },
  })
  expect((await changedElsewhere.json()).errors).toBeUndefined()
  release!()
  await expect(page.getByRole('alert')).toContainText(/changed|conflict|another/i)
  await expect(page.getByText('3 books', { exact: true })).toBeVisible()
  expect((await serverCart(page)).items.map((item) => item.quantity)).toEqual([3])
  await page.unrouteAll({ behavior: 'wait' })
})

test('Customer, Staff and Admin shopping carts remain separate and guests cannot read them', async ({
  page,
  request,
}) => {
  expect((await request.post('http://localhost:4100/__test__/seed-demo')).ok()).toBe(true)
  const guest = await request.post('http://localhost:4100/graphql', {
    headers: { Origin: 'http://localhost:4173' },
    data: { query: `{ myCart { ${cartFields} } }` },
  })
  expect((await guest.json()).errors[0].extensions.code).toBe('UNAUTHENTICATED')
  for (const [role, id, title] of [
    ['Customer', '1', 'The Great Gatsby'],
    ['Staff', '3', 'The Secret Garden'],
    ['Admin', '4', 'Jane Eyre'],
  ]) {
    await page.setExtraHTTPHeaders({ 'X-Real-IP': `198.51.100.${210 + Number(id)}` })
    await page.goto('/sign-in')
    await page.getByRole('button', { name: `Demo ${role}`, exact: true }).click()
    await expect(page).toHaveURL(role === 'Customer' ? '/' : '/admin')
    await page.goto('/cart')
    await expect(page.getByText('Nothing here yet.', { exact: true })).toBeVisible()
    await addBook(page, id)
    await expect(page.getByRole('link', { name: title, exact: true })).toBeVisible()
    await expect
      .poll(async () => (await serverCart(page)).items.map((item) => item.bookId))
      .toEqual([id])
    await signOut(page)
    await page.goto('/cart')
    await expect(page.getByText('Nothing here yet.', { exact: true })).toBeVisible()
  }
  await page.setExtraHTTPHeaders({ 'X-Real-IP': '198.51.100.219' })
  await page.goto('/sign-in')
  await page.getByRole('button', { name: 'Demo Customer', exact: true }).click()
  await expect(page).toHaveURL('/')
  await page.goto('/cart')
  await expect(page.getByRole('link', { name: 'The Great Gatsby', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'The Secret Garden', exact: true })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Jane Eyre', exact: true })).toHaveCount(0)
})

test('a shared-cookie account switch cannot submit A’s delayed edit into B’s cart', async ({
  page,
}) => {
  await page.goto('/')
  const accountA = await register(page, 'race-a')
  const accountB = await register(page, 'race-b')
  await signIn(page, accountA)
  await addBook(page, '1')
  await expect
    .poll(async () => (await serverCart(page)).items.map((item) => item.quantity))
    .toEqual([1])
  let release: (() => void) | undefined
  let intercepted = false
  await page.route('**/api/auth/get-session**', async (route) => {
    if (intercepted) return route.continue()
    intercepted = true
    const response = await route.fetch()
    await new Promise<void>((resolve) => {
      release = resolve
    })
    await route.fulfill({ response })
  })
  try {
    await page.getByRole('button', { name: 'Add one The Great Gatsby', exact: true }).click()
    await expect.poll(() => !!release).toBe(true)
    const switchAccount = await page.request.post('/api/auth/sign-in/email', {
      headers: { Origin: 'http://localhost:4173', 'X-Real-IP': '198.51.100.229' },
      data: { email: accountB, password },
    })
    expect(switchAccount.ok()).toBe(true)
    release!()
    await expect(page.getByRole('link', { name: 'The Great Gatsby', exact: true })).toHaveCount(0)
    await expect(page.getByText('Nothing here yet.', { exact: true })).toBeVisible()
    expect((await serverCart(page)).items).toEqual([])
    await page.reload()
    await expect(page.getByText('Nothing here yet.', { exact: true })).toBeVisible()
  } finally {
    release?.()
    await page.unrouteAll({ behavior: 'wait' })
  }
})

test('two tabs importing the same guest snapshot do not duplicate its quantity', async ({
  page,
  context,
}) => {
  await page.goto('/')
  const email = await register(page, 'tabs')
  await addBook(page, '1')
  const sibling = await context.newPage()
  await sibling.goto('/cart')
  await expect(sibling.getByRole('link', { name: 'The Great Gatsby', exact: true })).toBeVisible()
  const gates: (() => void)[] = []
  await context.route('**/graphql', async (route) => {
    if (gates.length < 2 && route.request().postDataJSON().query?.includes('myCart')) {
      const response = await route.fetch()
      await new Promise<void>((resolve) => gates.push(resolve))
      await route.fulfill({ response })
    } else await route.continue()
  })
  let signingIn: Promise<void> | undefined
  try {
    signingIn = signIn(page, email)
    await expect.poll(() => gates.length).toBe(1)
    await sibling.reload()
    await expect.poll(() => gates.length).toBe(2)
    gates.forEach((resolve) => resolve())
    await signingIn
    for (const client of [page, sibling]) {
      const retry = client.getByRole('button', { name: 'Retry merge', exact: true })
      if (await retry.isVisible()) await retry.click()
      await client.reload()
      await expect(
        client.getByRole('link', { name: 'The Great Gatsby', exact: true }),
      ).toBeVisible()
      await expect(client.getByText('1 book', { exact: true })).toBeVisible()
      await expect(client.getByRole('button', { name: 'Retry merge', exact: true })).toHaveCount(0)
    }
    expect((await serverCart(page)).items.map((item) => item.quantity)).toEqual([1])
  } finally {
    gates.forEach((resolve) => resolve())
    await context.unrouteAll({ behavior: 'wait' })
    await signingIn?.catch(() => {})
    await sibling.close()
  }
})

test('a definite stock rejection allows shopping to recover instead of retrying an invalid save forever', async ({
  page,
  browser,
}) => {
  await page.goto('/')
  await signIn(page, await register(page, 'stock-recovery'))
  await page.goto('/books/1')
  await expect(
    page
      .getByRole('form', { name: 'Book purchase' })
      .getByRole('button', { name: 'Add to bag', exact: true }),
  ).toBeEnabled()
  const admin = await browser.newContext()
  let stock = 0
  let reduced = false
  async function adjust(delta: number) {
    const response = await admin.request.post('http://localhost:4173/graphql', {
      headers: { Origin: 'http://localhost:4173' },
      data: {
        query: 'mutation ($delta: Int!) { adjustBookStock(id: "1", delta: $delta) { stock } }',
        variables: { delta },
      },
    })
    const body = await response.json()
    expect(body.errors).toBeUndefined()
  }
  try {
    const login = await admin.request.post('http://localhost:4173/api/auth/sign-in/email', {
      headers: { Origin: 'http://localhost:4173', 'X-Real-IP': '198.51.100.228' },
      data: { email: 'admin-e2e@example.com', password: 'bookstore-admin-test-123' },
    })
    expect(login.ok()).toBe(true)
    const current = await admin.request.post('http://localhost:4173/graphql', {
      headers: { Origin: 'http://localhost:4173' },
      data: { query: '{ book(id: "1") { stock } }' },
    })
    const currentBody = await current.json()
    expect(currentBody.errors).toBeUndefined()
    stock = currentBody.data.book.stock
    await adjust(-stock)
    reduced = true
    await page
      .getByRole('form', { name: 'Book purchase' })
      .getByRole('button', { name: 'Add to bag', exact: true })
      .click()
    await expect(page.getByRole('alert')).toContainText(/unavailable|stock/i)
    await expect(page.getByRole('button', { name: 'Retry save', exact: true })).toHaveCount(0)
    await addBook(page, '3')
    await expect(page.getByRole('link', { name: 'The Secret Garden', exact: true })).toBeVisible()
    expect((await serverCart(page)).items.map((item) => item.bookId)).toEqual(['3'])
  } finally {
    if (reduced) await adjust(stock)
    await admin.close()
  }
})

test('Staff sees unavailable guest-merge feedback on the workspace landing page', async ({
  page,
  browser,
  request,
}) => {
  expect((await request.post('http://localhost:4100/__test__/seed-demo')).ok()).toBe(true)
  await addBook(page, '1')
  const admin = await browser.newContext()
  let archived = false
  async function archive(value: boolean) {
    const response = await admin.request.post('http://localhost:4173/graphql', {
      headers: { Origin: 'http://localhost:4173' },
      data: {
        query:
          'mutation ($archived: Boolean!) { setBookArchived(id: "1", archived: $archived) { id } }',
        variables: { archived: value },
      },
    })
    expect((await response.json()).errors).toBeUndefined()
  }
  try {
    expect(
      (
        await admin.request.post('http://localhost:4173/api/auth/sign-in/email', {
          headers: { Origin: 'http://localhost:4173', 'X-Real-IP': '198.51.100.227' },
          data: { email: 'admin-e2e@example.com', password: 'bookstore-admin-test-123' },
        })
      ).ok(),
    ).toBe(true)
    await archive(true)
    archived = true
    await page.goto('/sign-in')
    await page.getByRole('button', { name: 'Demo Staff', exact: true }).click()
    await expect(page).toHaveURL('/admin')
    const notice = page.getByText('Book 1 could not be added because it is unavailable.', {
      exact: true,
    })
    await expect(notice).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible()
    await page.evaluate(() => window.dispatchEvent(new Event('focus')))
    await expect(notice).toBeVisible()
    expect((await serverCart(page)).items.every((item) => item.bookId !== '1')).toBe(true)
  } finally {
    if (archived) await archive(false)
    await admin.close()
  }
})
