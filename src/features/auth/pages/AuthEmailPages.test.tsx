// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import {
  CheckEmailPage,
  ForgotPasswordPage,
  ResetPasswordPage,
  VerificationResultPage,
} from './AuthEmailPages'

const api = vi.hoisted(() => ({ resend: vi.fn(), request: vi.fn(), reset: vi.fn() }))
vi.mock('../../../lib/auth-client', () => ({
  authClient: {
    sendVerificationEmail: api.resend,
    requestPasswordReset: api.request,
    resetPassword: api.reset,
  },
}))
afterEach(() => {
  cleanup()
  vi.resetAllMocks()
})
function Location() {
  const location = useLocation()
  return (
    <p data-testid="location">
      {location.pathname}
      {location.search}
    </p>
  )
}
function show(page: React.ReactNode, path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      {page}
      <Location />
    </MemoryRouter>,
  )
}
it('direct check-email allows resend and disables repeated accepted requests', async () => {
  api.resend.mockResolvedValue({ error: null })
  show(<CheckEmailPage />, '/check-email?returnTo=/checkout')
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('Email address'), 'reader@example.com')
  await user.click(screen.getByRole('button', { name: 'Resend verification email' }))
  expect(await screen.findByRole('status')).toBeTruthy()
  expect((screen.getByRole('button', { name: /Resend in/ }) as HTMLButtonElement).disabled).toBe(
    true,
  )
})
it('forgot-password accepts unknown identities neutrally and recovers from transport failures', async () => {
  api.request.mockRejectedValueOnce(new Error('Offline')).mockResolvedValueOnce({ error: null })
  show(<ForgotPasswordPage />, '/forgot-password?returnTo=//evil.example')
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('Email address'), 'unknown@example.com')
  await user.click(screen.getByRole('button', { name: 'Request reset link' }))
  expect(await screen.findByRole('alert')).toBeTruthy()
  await user.click(screen.getByRole('button', { name: 'Request reset link' }))
  expect(await screen.findByRole('status')).toBeTruthy()
  expect(screen.getByRole('link', { name: 'Sign in' }).getAttribute('href')).toBe(
    '/sign-in?returnTo=%2F',
  )
})
it('reset validates confirmation and removes its token on success without signing in', async () => {
  api.reset.mockResolvedValue({ error: null })
  show(<ResetPasswordPage />, '/reset-password?token=private-token&returnTo=/checkout')
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('New password'), 'new-password-123')
  await user.type(screen.getByLabelText('Confirm new password'), 'different-password')
  await user.click(screen.getByRole('button', { name: 'Reset password' }))
  expect(await screen.findByText('Passwords must match.')).toBeTruthy()
  await user.clear(screen.getByLabelText('Confirm new password'))
  await user.type(screen.getByLabelText('Confirm new password'), 'new-password-123')
  await user.click(screen.getByRole('button', { name: 'Reset password' }))
  expect(await screen.findByRole('heading', { name: 'Password reset' })).toBeTruthy()
  await waitFor(() => expect(screen.getByTestId('location').textContent).not.toContain('token='))
  expect(screen.getByRole('link', { name: 'Sign in' }).getAttribute('href')).toBe(
    '/sign-in?returnTo=%2Fcheckout',
  )
})
it.each(['/reset-password', '/reset-password?error=INVALID_TOKEN'])(
  'invalid reset link %s offers a new request',
  (path) => {
    show(<ResetPasswordPage />, path)
    expect(screen.getByRole('link', { name: 'Request a new reset link' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Reset password' })).toBeNull()
  },
)
it('verification errors offer resend and never claim success', () => {
  show(<VerificationResultPage />, '/verification-result?error=TOKEN_EXPIRED&returnTo=/checkout')
  expect(screen.getByRole('link', { name: 'Request a verification email' })).toBeTruthy()
  expect(screen.queryByRole('heading', { name: 'Email verified' })).toBeNull()
})
it('verification landing copy remains neutral even for a forged success query', () => {
  show(<VerificationResultPage />, '/verification-result?success=true&returnTo=/checkout')
  expect(screen.getByRole('heading', { name: 'Email verification' })).toBeTruthy()
  expect(screen.getByRole('link', { name: 'Sign in' }).getAttribute('href')).toBe(
    '/sign-in?returnTo=%2Fcheckout',
  )
  expect(screen.queryByText(/email verified/i)).toBeNull()
})
it.each(['Retry-After', 'X-Retry-After'])(
  'resend respects %s from a throttled server response',
  async (header) => {
    api.resend.mockImplementation(async (_body, options) => {
      options.onResponse({
        response: new Response(null, { status: 429, headers: { [header]: '120' } }),
      })
      return { error: { status: 429 } }
    })
    show(<CheckEmailPage />, '/check-email')
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Email address'), 'reader@example.com')
    await user.click(screen.getByRole('button', { name: 'Resend verification email' }))
    expect(await screen.findByRole('alert')).toBeTruthy()
    expect(
      (screen.getByRole('button', { name: 'Resend in 120s' }) as HTMLButtonElement).disabled,
    ).toBe(true)
    expect(screen.queryByRole('status')).toBeNull()
  },
)
it('reset network failure keeps the editable form usable for retry', async () => {
  api.reset.mockRejectedValueOnce(new Error('Offline'))
  show(<ResetPasswordPage />, '/reset-password?token=private-token')
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('New password'), 'new-password-123')
  await user.type(screen.getByLabelText('Confirm new password'), 'new-password-123')
  await user.click(screen.getByRole('button', { name: 'Reset password' }))
  expect(await screen.findByRole('alert')).toBeTruthy()
  expect(
    (screen.getByRole('button', { name: 'Reset password' }) as HTMLButtonElement).disabled,
  ).toBe(false)
  expect(screen.getByTestId('location').textContent).toContain('token=private-token')
})
