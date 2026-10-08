import { reviewDelivery, checkoutInput } from './delivery'
import { hostedPayment } from './hosted-payment'
import { expect, test } from '@playwright/test'

test('cart survives sign-in redirect; account checkout appears in order history', async ({
  page,
}) => {
  await hostedPayment(page)
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
  await reviewDelivery(page)
  await page.getByRole('button', { name: 'Continue to payment' }).click()
  await expect(page.getByRole('heading', { name: 'Payment confirmed' })).toBeVisible()
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

  const consumeResponse = await page.request.post('/graphql', {
    headers: { Origin: 'http://localhost:4173' },
    data: {
      query:
        'mutation ($input: CreateCheckoutInput!) { createCheckout(input: $input) { order { id } } }',
      variables: { input: await checkoutInput(page, [{ bookId: '10', quantity: 6 }]) },
    },
  })
  const consume = await consumeResponse.json()
  expect(consume.errors).toBeUndefined()
  await page.getByLabel('Phone number', { exact: true }).fill('+1 202 555 0123')
  await page.getByLabel('Address line 1', { exact: true }).fill('123 Reading Lane')
  await page.getByLabel('City', { exact: true }).fill('Boston')
  await page.getByLabel('Country', { exact: true }).selectOption('US')
  await page.getByRole('button', { name: 'Review order', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText(/stock/i)
  await page.goto('/cart')
  await expect(page.getByRole('link', { name: 'Dracula', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Account', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Sign out' }).click()
  await page.reload()
  await expect(page.getByRole('link', { name: 'Dracula', exact: true })).toBeVisible()
})

test('interrupted hosted payment preserves the bag and changed bag survives confirmed payment', async ({
  page,
}) => {
  await hostedPayment(page, false)
  await page.goto('/sign-up?returnTo=%2F')
  await page.getByLabel('Full name').fill('Interrupted Reader')
  await page.getByLabel('Email address').fill('interrupted@example.com')
  await page.getByLabel('Password').fill('bookstore-password-123')
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page).toHaveURL('http://localhost:4173/')
  await page.goto('/books/1')
  await page.getByRole('button', { name: 'Add to bag', exact: true }).click()
  await page.goto('/checkout')
  await expect(page.getByRole('button', { name: 'Review order' })).toBeVisible()
  await page.clock.install()
  await reviewDelivery(page)
  await page.getByRole('button', { name: 'Continue to payment' }).click()
  await expect(page).toHaveURL(/checkout\/return\/\d+/)
  await expect(page.getByText('Payment pending · USD')).toBeVisible()
  await page.clock.fastForward(31_000)
  await expect(
    page.getByText('Payment has not been confirmed. Check payment status when you are ready.'),
  ).toBeVisible()
  await expect(page.getByText('Payment pending · USD')).toBeVisible()
  const id = new URL(page.url()).pathname.split('/').at(-1)!
  await page.goto('/cart')
  await expect(page.getByRole('link', { name: 'The Great Gatsby', exact: true })).toBeVisible()
  await page.goto('/books/2')
  await page.getByRole('button', { name: 'Add to bag', exact: true }).click()
  await page.request.post(`http://localhost:4100/__test__/pay/${id}`)
  await page.goto(`/checkout/return/${id}?outcome=back`)
  await expect(page.getByRole('heading', { name: 'Payment confirmed' })).toBeVisible()
  await page.goto('/cart')
  await expect(page.getByRole('link', { name: 'The Great Gatsby', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Pride and Prejudice', exact: true })).toBeVisible()
})

test('address edits invalidate review and invalid phone cannot authorize payment', async ({
  page,
}) => {
  const fee = Number(process.env.E2E_DELIVERY_FEE_CENTS ?? '500')
  await hostedPayment(page)
  await page.goto('/sign-up?returnTo=%2F')
  await page.getByLabel('Full name').fill('Address Reader')
  await page.getByLabel('Email address').fill('address-review@example.com')
  await page.getByLabel('Password').fill('bookstore-password-123')
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page).toHaveURL('http://localhost:4173/')
  await page.goto('/books/1')
  await page.getByRole('button', { name: 'Add to bag', exact: true }).click()
  await page.goto('/checkout')
  await page.setViewportSize({ width: 390, height: 844 })
  await reviewDelivery(page)
  if (fee > 0)
    await expect(
      page.getByText(`$${(fee / 100).toFixed(2)}`, { exact: true }).first(),
    ).toBeVisible()
  else await expect(page.getByText('Free delivery', { exact: true }).first()).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.getByRole('button', { name: /Edit address/i }).click()
  await page.getByLabel('Phone number', { exact: true }).fill('123')
  await page.getByRole('button', { name: 'Review order', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Continue to payment', exact: true })).toHaveCount(
    0,
  )
  await page.getByLabel('Phone number', { exact: true }).fill('+1 202 555 0123')
  await page.getByLabel('City', { exact: true }).fill('Cambridge')
  await page.getByRole('button', { name: 'Review order', exact: true }).click()
  await expect(page.getByText(/Cambridge/).first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Continue to payment', exact: true })).toBeEnabled()
  const privateLocalData = await page.evaluate(() =>
    Object.entries(localStorage)
      .map(([, value]) => value)
      .join('\n'),
  )
  expect(privateLocalData).not.toContain('123 Reading Lane')
  expect(privateLocalData).not.toContain('+1 202 555 0123')
  await page.getByRole('button', { name: 'Continue to payment', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Payment confirmed' })).toBeVisible()
  await expect(
    page.getByText(`$${((1699 + fee) / 100).toFixed(2)}`, { exact: true }).first(),
  ).toBeVisible()
  await expect(page.getByText(/Cambridge/).first()).toBeVisible()
})
