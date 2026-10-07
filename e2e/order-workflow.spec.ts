import { expect, test, type Page } from '@playwright/test'

const origin = 'http://localhost:4173'
const password = 'BookstoreDemo123!'
test.beforeEach(async ({ request, page }, info) => {
  expect((await request.post('http://localhost:4100/__test__/seed-demo')).ok()).toBe(true)
  await page.setExtraHTTPHeaders({ 'X-Real-IP': `203.0.113.${info.line}` })
})

async function signIn(page: Page, role: 'Customer' | 'Staff' | 'Admin', destination: string) {
  await page.goto(`/sign-in?returnTo=${encodeURIComponent(destination)}`)
  await page.getByLabel('Email address').fill(`demo-${role.toLowerCase()}@example.com`)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page).toHaveURL(destination)
}

async function gql(page: Page, query: string, variables: Record<string, unknown> = {}) {
  const response = await page.request.post('/graphql', {
    headers: { Origin: origin },
    data: { query, variables },
  })
  return response.json()
}

test('customer submits, staff accepts and completes, and admin reviews the history', async ({
  page,
  browser,
}) => {
  await signIn(page, 'Customer', '/')
  await page.goto('/books/1')
  await page.getByRole('button', { name: 'Add to bag', exact: true }).click()
  await page.goto('/checkout')
  await page.getByRole('button', { name: 'Submit order request' }).click()
  await page.getByRole('link', { name: 'View order details', exact: true }).click()
  await expect(page).toHaveURL(/\/account\/orders\/\d+$/)
  const id = page.url().split('/').at(-1)!
  await expect(page.getByText('Submitted', { exact: true }).first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Accept request' })).toHaveCount(0)
  const denied = await gql(
    page,
    'query ($id: ID!) { myOrder(id: $id) { id history { actorName } } }',
    { id },
  )
  expect(denied.errors).toBeDefined()

  const staff = await browser.newContext({ extraHTTPHeaders: { 'X-Real-IP': '203.0.113.101' } })
  const admin = await browser.newContext({ extraHTTPHeaders: { 'X-Real-IP': '203.0.113.102' } })
  try {
    const staffPage = await staff.newPage()
    await signIn(staffPage, 'Staff', `/admin/orders/${id}`)
    await staffPage.getByRole('button', { name: 'Accept request', exact: true }).click()
    await staffPage
      .getByRole('dialog')
      .getByRole('button', { name: /Confirm/ })
      .click()
    await expect(staffPage.getByText('Accepted', { exact: true }).first()).toBeVisible()
    await staffPage.getByRole('button', { name: 'Complete request', exact: true }).click()
    await staffPage
      .getByRole('dialog')
      .getByRole('button', { name: /Confirm/ })
      .click()
    await expect(staffPage.getByText('Completed', { exact: true }).first()).toBeVisible()
    await expect(
      staffPage.getByRole('button', { name: 'Cancel request', exact: true }),
    ).toHaveCount(0)
    await page.reload()
    await expect(page.getByText('Completed', { exact: true }).first()).toBeVisible()
    await expect(page.getByText(/Demo Staff/)).toHaveCount(0)

    const adminPage = await admin.newPage()
    await signIn(adminPage, 'Admin', '/admin/activity?action=ORDER_STATUS_CHANGED')
    await expect(adminPage.getByText(`Order request #${id}`, { exact: true }).first()).toBeVisible()
    await adminPage.getByRole('link', { name: 'View order request', exact: true }).first().click()
    await expect(adminPage).toHaveURL(`/admin/orders/${id}`)
    await expect(adminPage.getByText(/Demo Staff/).first()).toBeVisible()
    await adminPage.setViewportSize({ width: 390, height: 844 })
    expect(
      await adminPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true)
    await adminPage.screenshot({
      path: 'test-results/order-workflow-completed-mobile.png',
      fullPage: true,
    })
  } finally {
    await staff.close()
    await admin.close()
  }
})

test('admin cancels submitted and staff cancels accepted with archived restoration once', async ({
  page,
  browser,
}) => {
  await signIn(page, 'Admin', '/admin/books')
  const created = await gql(
    page,
    'mutation { createBook(input: { details: { title: "Workflow cancellation book", author: "Author", genre: "Genre", description: "Cancellation test", priceCents: 1234 }, stock: 5 }) { id } }',
  )
  expect(created.errors).toBeUndefined()
  const bookId = created.data.createBook.id
  const customer = await browser.newContext({ extraHTTPHeaders: { 'X-Real-IP': '203.0.113.103' } })
  const staff = await browser.newContext({ extraHTTPHeaders: { 'X-Real-IP': '203.0.113.104' } })
  try {
    const customerPage = await customer.newPage()
    await signIn(customerPage, 'Customer', '/')
    const submitted = await gql(
      customerPage,
      'mutation ($input: PlaceOrderInput!) { placeOrder(input: $input) { id status } }',
      { input: { items: [{ bookId, quantity: 1 }] } },
    )
    expect(submitted.errors).toBeUndefined()
    const submittedId = submitted.data.placeOrder.id
    await page.goto(`/admin/orders/${submittedId}`)
    await expect(page.getByRole('button', { name: 'Complete request', exact: true })).toHaveCount(0)
    await page.getByRole('button', { name: 'Cancel request', exact: true }).click()
    const submittedDialog = page.getByRole('dialog')
    await submittedDialog.getByLabel('Reason shown to customer').fill('   ')
    await submittedDialog.getByRole('button', { name: /Confirm/ }).click()
    await expect(submittedDialog.getByRole('alert')).toContainText('between 1 and 500')
    await submittedDialog.getByLabel('Reason shown to customer').fill('Cannot fulfil the request.')
    await submittedDialog.getByRole('button', { name: /Confirm/ }).click()
    await expect(page.getByText('Cancelled', { exact: true }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Accept request', exact: true })).toHaveCount(0)
    const submittedHistory = await gql(
      customerPage,
      'query ($id: ID!) { myOrder(id: $id) { status history { toStatus cancellationReason } } }',
      { id: submittedId },
    )
    expect(submittedHistory.errors).toBeUndefined()
    expect(submittedHistory.data.myOrder).toEqual({
      status: 'CANCELLED',
      history: [
        { toStatus: 'SUBMITTED', cancellationReason: null },
        { toStatus: 'CANCELLED', cancellationReason: 'Cannot fulfil the request.' },
      ],
    })
    const returned = await gql(page, 'query ($id: ID!) { adminBook(id: $id) { stock } }', {
      id: bookId,
    })
    expect(returned.errors).toBeUndefined()
    expect(returned.data.adminBook.stock).toBe(5)
    const placed = await gql(
      customerPage,
      'mutation ($input: PlaceOrderInput!) { placeOrder(input: $input) { id status totalCents } }',
      { input: { items: [{ bookId, quantity: 2 }] } },
    )
    expect(placed.errors).toBeUndefined()
    const id = placed.data.placeOrder.id
    expect(placed.data.placeOrder.totalCents).toBe(2468)
    expect(
      (
        await gql(page, 'mutation ($id: ID!) { setBookArchived(id: $id, archived: true) { id } }', {
          id: bookId,
        })
      ).errors,
    ).toBeUndefined()
    const staffPage = await staff.newPage()
    await signIn(staffPage, 'Staff', `/admin/orders/${id}`)
    await staffPage.getByRole('button', { name: 'Accept request', exact: true }).click()
    await staffPage
      .getByRole('dialog')
      .getByRole('button', { name: /Confirm/ })
      .click()
    await expect(staffPage.getByText('Accepted', { exact: true }).first()).toBeVisible()
    const cancelRequest = staffPage.getByRole('button', { name: 'Cancel request', exact: true })
    await cancelRequest.click()
    await staffPage.keyboard.press('Escape')
    await expect(staffPage.getByRole('dialog')).toHaveCount(0)
    await expect(cancelRequest).toBeFocused()
    await cancelRequest.click()
    const dialog = staffPage.getByRole('dialog')
    await dialog.getByLabel('Reason shown to customer').fill('   Unable to fulfil this request.   ')
    await dialog.getByRole('button', { name: /Confirm/ }).click()
    await expect(staffPage.getByText('Cancelled', { exact: true }).first()).toBeVisible()
    await customerPage.goto(`/account/orders/${id}`)
    await expect(
      customerPage.getByText('Reason: Unable to fulfil this request.', { exact: true }),
    ).toBeVisible()
    await expect(customerPage.getByText('$24.68', { exact: true }).first()).toBeVisible()
    const retry = await gql(
      staffPage,
      'mutation ($input: SetOrderStatusInput!) { setOrderStatus(input: $input) { status history { id } } }',
      {
        input: {
          id,
          expectedStatus: 'ACCEPTED',
          status: 'CANCELLED',
          cancellationReason: 'Repeat attempt',
        },
      },
    )
    expect(retry.errors).toBeUndefined()
    expect(retry.data.setOrderStatus.history).toHaveLength(3)
    const stock = await gql(page, 'query ($id: ID!) { adminBook(id: $id) { stock archived } }', {
      id: bookId,
    })
    expect(stock.data.adminBook).toEqual({ stock: 5, archived: true })
    await staffPage.goto('/admin/orders?status=CANCELLED')
    await expect(staffPage.getByRole('row').filter({ hasText: `#${id}` })).toBeVisible()
    await staffPage
      .getByRole('row')
      .filter({ hasText: `#${id}` })
      .getByRole('link', { name: /View request/ })
      .click()
    await staffPage.getByRole('link', { name: 'Back to order requests', exact: true }).click()
    await expect(staffPage).toHaveURL(/status=CANCELLED/)
    await customerPage.screenshot({
      path: 'test-results/order-workflow-cancelled-customer.png',
      fullPage: true,
    })
  } finally {
    await customer.close()
    await staff.close()
  }
})
