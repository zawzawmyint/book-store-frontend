import { expect, test } from '@playwright/test'

test('cart survives sign-in redirect; account checkout appears in order history', async ({
  page,
}) => {
  await page.goto('/books/1')
  await page.getByRole('button', { name: 'Add to bag', exact: true }).click()
  await page.getByRole('link', { name: /View bag/ }).click()
  await page.getByRole('link', { name: /Continue to checkout/ }).click()
  await expect(page).toHaveURL(/\/sign-in\?returnTo=/)
  await page.reload()
  await page.getByRole('link', { name: 'Create an account' }).click()
  await page.getByLabel('Full name').fill('Ada Reader')
  await page.getByLabel('Email address').fill('ada@example.com')
  await page.getByLabel('Password').fill('bookstore-password-123')
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page).toHaveURL(/\/checkout$/)
  await expect(page.getByText('ada@example.com')).toBeVisible()
  const title = page.getByText('The Great Gatsby', { exact: true })
  expect(await title.evaluate((el) => getComputedStyle(el).fontFamily)).toContain('Lora')
  await page.getByRole('button', { name: 'Submit order request' }).click()
  await expect(page.getByRole('heading', { name: 'Thank you, Ada.' })).toBeVisible()
  expect(await title.evaluate((el) => getComputedStyle(el).fontFamily)).toContain('Lora')
  await page.goto('/account/orders')
  await expect(page.getByRole('heading', { name: 'Your orders' })).toBeVisible()
  await expect(page.getByText('1 × The Great Gatsby')).toBeVisible()
  expect(await title.evaluate((el) => getComputedStyle(el).fontFamily)).toContain('Lora')
  await page.getByRole('button', { name: 'Account', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Sign out' }).click()
  await expect(page.getByRole('link', { name: 'Sign in', exact: true })).toBeVisible()
  await page.goto('/account/orders')
  await expect(page).toHaveURL(/\/sign-in\?returnTo=/)
  await page.getByLabel('Email address').fill('ada@example.com')
  await page.getByLabel('Password').fill('bookstore-password-123')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page).toHaveURL(/\/account\/orders$/)
  await expect(page.getByText('1 × The Great Gatsby')).toBeVisible()
})

test('stock failure keeps the cart and protected API rejects guests', async ({ page, request }) => {
  const guestResponse = await request.post('http://localhost:4100/graphql', {
    data: { query: '{ myOrders { total } }' },
  })
  expect((await guestResponse.json()).errors?.[0]?.extensions?.code).toBe('UNAUTHENTICATED')

  await page.goto('/sign-up?returnTo=%2Fcheckout')
  await page.getByLabel('Full name').fill('Second Reader')
  await page.getByLabel('Email address').fill('second@example.com')
  await page.getByLabel('Password').fill('bookstore-password-456')
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page).toHaveURL(/\/checkout$/)
  await page.goto('/books/10')
  await page.getByRole('button', { name: 'Add to bag', exact: true }).click()
  await page.getByRole('link', { name: /View bag/ }).click()
  await page.getByRole('link', { name: /Continue to checkout/ }).click()

  const consume = await page.evaluate(async () => {
    const response = await fetch('/graphql', {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        query: 'mutation { placeOrder(input: { items: [{ bookId: "10", quantity: 6 }] }) { id } }',
      }),
    })
    return response.json()
  })
  expect(consume.errors).toBeUndefined()
  await page.getByRole('button', { name: 'Submit order request' }).click()
  await expect(page.getByRole('alert')).toContainText(/stock/i)
  await page.goto('/cart')
  await expect(page.getByRole('link', { name: 'Dracula', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Account', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Sign out' }).click()
  await page.reload()
  await expect(page.getByRole('link', { name: 'Dracula', exact: true })).toBeVisible()
})
