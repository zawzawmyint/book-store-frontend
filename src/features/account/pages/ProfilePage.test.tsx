// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProfilePage } from './ProfilePage'

const auth = vi.hoisted(() => ({
  updateUser: vi.fn(),
  changePassword: vi.fn(),
  refetch: vi.fn(async () => {}),
}))
vi.mock('../../../lib/auth-client', () => ({
  authClient: {
    useSession: () => ({
      data: {
        user: {
          id: 'ada',
          name: 'Ada Reader',
          email: 'ada@example.com',
          createdAt: new Date('2026-01-02T00:00:00.000Z'),
        },
      },
      isPending: false,
      refetch: auth.refetch,
    }),
    updateUser: auth.updateUser,
    changePassword: auth.changePassword,
  },
}))
afterEach(() => {
  cleanup()
  auth.updateUser.mockReset()
  auth.changePassword.mockReset()
  auth.refetch.mockClear()
})

it('rejects an empty name and a mismatched or short password before saving', async () => {
  const user = userEvent.setup()
  render(<ProfilePage />)
  expect(screen.getByText('ada@example.com')).toBeTruthy()
  expect(screen.getByText(new Date('2026-01-02T00:00:00.000Z').toLocaleDateString())).toBeTruthy()
  expect(screen.queryByLabelText('Email')).toBeNull()
  await user.clear(screen.getByLabelText('Full name'))
  await user.click(screen.getByRole('button', { name: 'Save name' }))
  expect(await screen.findByText('Enter your name.')).toBeTruthy()
  expect(auth.updateUser).not.toHaveBeenCalled()
  await user.type(screen.getByLabelText('Current password'), 'current-password')
  await user.type(screen.getByLabelText('New password'), 'short')
  await user.type(screen.getByLabelText('Confirm new password'), 'other-password')
  await user.click(screen.getByRole('button', { name: 'Change password' }))
  expect(await screen.findByText('Use at least 8 characters.')).toBeTruthy()
  expect(auth.changePassword).not.toHaveBeenCalled()
  await user.clear(screen.getByLabelText('New password'))
  await user.type(screen.getByLabelText('New password'), 'new-password-123')
  await user.click(screen.getByRole('button', { name: 'Change password' }))
  expect(await screen.findByText('Enter the same password again.')).toBeTruthy()
  expect(auth.changePassword).not.toHaveBeenCalled()
})

it('saves a trimmed name and refreshes the session', async () => {
  const user = userEvent.setup()
  auth.updateUser.mockResolvedValue({ data: { status: true } })
  render(<ProfilePage />)
  await user.clear(screen.getByLabelText('Full name'))
  await user.type(screen.getByLabelText('Full name'), '  Ada Updated  ')
  await user.click(screen.getByRole('button', { name: 'Save name' }))
  expect(await screen.findByText('Name updated.')).toBeTruthy()
  expect(auth.updateUser).toHaveBeenCalledWith({ name: 'Ada Updated' })
  expect(auth.refetch).toHaveBeenCalled()
})

it('keeps the password fields when the current password is rejected', async () => {
  const user = userEvent.setup()
  auth.changePassword.mockResolvedValue({ error: { message: 'Invalid password' } })
  render(<ProfilePage />)
  await user.type(screen.getByLabelText('Current password'), 'wrong-password')
  await user.type(screen.getByLabelText('New password'), 'new-password-123')
  await user.type(screen.getByLabelText('Confirm new password'), 'new-password-123')
  await user.click(screen.getByRole('button', { name: 'Change password' }))
  expect(await screen.findByRole('alert')).toHaveProperty('textContent', expect.stringContaining('Invalid password'))
  expect(screen.getByLabelText('Current password')).toHaveProperty('value', 'wrong-password')
  expect(screen.getByLabelText('New password')).toHaveProperty('value', 'new-password-123')
  expect(auth.changePassword).toHaveBeenCalledWith({
    currentPassword: 'wrong-password',
    newPassword: 'new-password-123',
    revokeOtherSessions: true,
  })
})
