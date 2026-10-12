import { expect, test } from '@playwright/test'
import { capturedEmailLink, signInRespectingRateLimit, verifyAndSignIn } from './auth-email-helpers'

const oldPassword = 'bookstore-email-test-123'
const newPassword = 'bookstore-recovered-456'

test('verification preserves the bag, requires fresh signin, and recovery revokes other sessions', async ({
  page,
  browser,
}) => {
  const email = 'email-journey@example.com'
  await page.goto('/books/1')
  await page.getByRole('button', { name: 'Add to bag', exact: true }).click()
  await page.goto('/sign-up?returnTo=%2Fcheckout')
  await page.getByLabel('Full name').fill('Email Reader')
  await page.getByLabel('Email address').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(oldPassword)
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page).toHaveURL(/\/check-email\?returnTo=%2Fcheckout/)
  const verificationLink = await capturedEmailLink(page, email)
  await page.goto('/checkout')
  await expect(page).toHaveURL(/\/sign-in\?returnTo=%2Fcheckout/)
  await page.getByLabel('Email address').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(oldPassword)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page.getByRole('link', { name: 'Request a verification email' })).toBeVisible()
  await page.goto(verificationLink)
  await expect(page.getByRole('heading', { name: 'Email verification' })).toBeVisible()
  await page.getByRole('link', { name: 'Sign in', exact: true }).last().click()
  await page.getByLabel('Email address').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(oldPassword)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page).toHaveURL(/\/checkout$/)
  await expect(page.getByText('The Great Gatsby', { exact: true })).toBeVisible()

  const otherContext = await browser.newContext()
  const other = await otherContext.newPage()
  try {
    await other.goto('http://localhost:4173/sign-in?returnTo=%2Faccount%2Fprofile')
    await other.getByLabel('Email address').fill(email)
    await other.getByLabel('Password', { exact: true }).fill(oldPassword)
    await other.getByRole('button', { name: 'Sign in', exact: true }).click()
    await expect(other.getByRole('heading', { name: 'Your profile' })).toBeVisible()
    await page.getByRole('button', { name: 'Account', exact: true }).click()
    await page.getByRole('menuitem', { name: 'Sign out' }).click()
    await page.goto('/forgot-password?returnTo=%2Fcheckout')
    await page.getByLabel('Email address').fill(email)
    await page.getByRole('button', { name: 'Request reset link' }).click()
    await expect(page.getByRole('status')).toContainText('If this address is eligible')
    const resetLink = await capturedEmailLink(page, email)
    await page.goto(resetLink)
    await expect(page.getByRole('heading', { name: 'Choose a new password' })).toBeVisible()
    const consumedTokenURL = page.url()
    await page.getByLabel('New password', { exact: true }).fill(newPassword)
    await page.getByLabel('Confirm new password').fill(newPassword)
    await page.getByRole('button', { name: 'Reset password', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Password reset', exact: true })).toBeVisible()
    expect(new URL(page.url()).searchParams.has('token')).toBe(false)
    await other.reload()
    await expect(other).toHaveURL(/\/sign-in\?returnTo=/)
    await page.getByRole('link', { name: 'Sign in', exact: true }).last().click()
    await page.getByLabel('Email address').fill(email)
    await page.getByLabel('Password', { exact: true }).fill(oldPassword)
    const rejected = await signInRespectingRateLimit(page)
    expect(rejected.status()).toBe(401)
    await expect(page.getByRole('alert')).toBeVisible()
    await page.getByLabel('Password', { exact: true }).fill(newPassword)
    expect((await signInRespectingRateLimit(page)).status()).toBe(200)
    await expect(page).toHaveURL(/\/checkout$/)
    await expect(page.getByText('The Great Gatsby', { exact: true })).toBeVisible()
    await page.goto(consumedTokenURL)
    await page.getByLabel('New password', { exact: true }).fill(oldPassword)
    await page.getByLabel('Confirm new password').fill(oldPassword)
    await page.getByRole('button', { name: 'Reset password', exact: true }).click()
    await expect(page.getByRole('link', { name: 'Request a new reset link' })).toBeVisible()
  } finally {
    await otherContext.close()
  }
})

test('resend survives reload, respects cooldown, and unknown recovery stays neutral', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  async function checkMobileThemes(title: string, labels: string[] = []) {
    const toggle = page.getByRole('switch', { name: 'Dark mode', exact: true })
    for (const dark of [true, false]) {
      if ((await toggle.getAttribute('aria-checked')) !== String(dark)) await toggle.click()
      await expect(toggle).toHaveAttribute('aria-checked', String(dark))
      await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible()
      for (const label of labels)
        await expect(page.getByLabel(label, { exact: true })).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      )
    }
  }
  const email = 'email-resend@example.com'
  await page.goto('/sign-up?returnTo=%2Faccount%2Fprofile')
  await page.getByLabel('Full name').fill('Resend Reader')
  await page.getByLabel('Email address').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(oldPassword)
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page).toHaveURL(/\/check-email/)
  await page.reload()
  await checkMobileThemes('Check your email', ['Email address'])
  await page.getByLabel('Email address').focus()
  await page.keyboard.type(email)
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: 'Resend verification email' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('status')).toContainText('If this address is eligible')
  await expect(page.getByRole('button', { name: /Resend in/ })).toBeDisabled()
  expect(page.url()).not.toContain(email)
  const persisted = await page.evaluate(() => Object.values(localStorage).join('\n'))
  expect(persisted).not.toContain(email)
  await verifyAndSignIn(page, email, oldPassword)
  await expect(page.getByRole('heading', { name: 'Your profile' })).toBeVisible()
  await page.getByRole('button', { name: 'Account', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Sign out' }).click()
  await page.goto('/forgot-password?returnTo=https://evil.example')
  await checkMobileThemes('Forgot password?', ['Email address'])
  await page.getByLabel('Email address').focus()
  await page.keyboard.type('unknown-email@example.com')
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: 'Request reset link' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('status')).toContainText('If this address is eligible')
  await expect(page.getByRole('link', { name: 'Sign in', exact: true }).last()).toHaveAttribute(
    'href',
    '/sign-in?returnTo=%2F',
  )
  await page.goto('/reset-password?error=INVALID_TOKEN')
  await expect(page.getByRole('link', { name: 'Request a new reset link' })).toBeVisible()
  await page.goto(
    'http://localhost:4173/api/auth/verify-email?token=invalid&callbackURL=' +
      encodeURIComponent('http://localhost:4173/verification-result?returnTo=%2Fcheckout'),
  )
  await expect(page.getByRole('heading', { name: 'Verification link unavailable' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Request a verification email' })).toBeVisible()
  await checkMobileThemes('Verification link unavailable')
  await page.getByRole('link', { name: 'Request a verification email' }).focus()
  await expect(page.getByRole('link', { name: 'Request a verification email' })).toBeFocused()

  // A nonempty placeholder opens the form for layout checks; only the backend validates tokens.
  await page.goto('/reset-password?token=layout-only-placeholder')
  await checkMobileThemes('Choose a new password', ['New password', 'Confirm new password'])
  await page.getByLabel('New password', { exact: true }).focus()
  await page.keyboard.type(newPassword)
  await page.keyboard.press('Tab')
  await expect(page.getByLabel('Confirm new password')).toBeFocused()
  await page.keyboard.type(newPassword)
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: 'Reset password', exact: true })).toBeFocused()
  // Do not submit the placeholder token or consume another mail/rate-limit allowance.
})
