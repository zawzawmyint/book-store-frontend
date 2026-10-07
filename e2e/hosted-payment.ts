import type { Page } from '@playwright/test'
export async function hostedPayment(page: Page, paid = true) {
  await page.route('https://checkout.stripe.com/**', async (route) => {
    const id = new URL(route.request().url()).pathname.split('/').at(-1)!
    if (paid) {
      const result = await page.request.post(`http://localhost:4100/__test__/pay/${id}`)
      const { returnUrl } = await result.json()
      await route.fulfill({ status: 302, headers: { location: returnUrl }, body: '' })
    } else
      await route.fulfill({
        status: 302,
        headers: { location: `http://localhost:4173/checkout/return/${id}?outcome=back` },
        body: '',
      })
  })
}
