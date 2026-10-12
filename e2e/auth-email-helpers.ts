import { expect, type Page } from '@playwright/test'

export async function capturedEmailLink(page: Page, email: string): Promise<string> {
  const response = await page.request.get(
    `http://localhost:4100/__test/mail?email=${encodeURIComponent(email)}`,
  )
  expect(response.ok()).toBe(true)
  const message = (await response.json()) as { text: string }
  const link = message.text.match(/https?:\/\/[^\s<>"']+/)?.[0]
  expect(link).toBeTruthy()
  return link!
}

/** Complete the real browser verification journey after submitting signup. */
export async function verifyAndSignIn(page: Page, email: string, password: string) {
  await expect(page).toHaveURL(/\/check-email\?returnTo=/)
  await page.goto(await capturedEmailLink(page, email))
  await expect(page.getByRole('heading', { name: 'Email verification' })).toBeVisible()
  await page.getByRole('link', { name: 'Sign in', exact: true }).last().click()
  await page.getByLabel('Email address').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  expect((await signInRespectingRateLimit(page)).status()).toBe(200)
}

/** Respect real server throttling when one journey signs in across several sessions. */
export async function signInRespectingRateLimit(page: Page) {
  async function attempt() {
    const response = page.waitForResponse(
      (response) =>
        response.url().endsWith('/api/auth/sign-in/email') &&
        response.request().method() === 'POST',
    )
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()
    return response
  }
  let response = await attempt()
  if (response.status() === 429) {
    const timing = response.headers()['retry-after'] ?? response.headers()['x-retry-after']
    expect(timing).toBeTruthy()
    const seconds = Number(timing)
    expect(Number.isFinite(seconds)).toBe(true)
    // A real server time window is intentionally observed; browser clock mocking cannot advance it.
    await page.waitForTimeout((seconds + 1) * 1000)
    response = await attempt()
  }
  return response
}
