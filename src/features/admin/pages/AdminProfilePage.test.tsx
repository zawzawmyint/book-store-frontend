// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AdminProfilePage } from './AdminProfilePage'

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
          id: 'admin-1',
          name: 'Ada Admin',
          email: 'admin@example.com',
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
})

it('keeps the admin profile in the workspace and saves the signed-in name', async () => {
  const user = userEvent.setup()
  auth.updateUser.mockResolvedValue({ data: { status: true } })
  render(<AdminProfilePage />)
  expect(screen.getByRole('heading', { name: 'Your profile' })).toBeTruthy()
  expect(screen.getByText('admin@example.com')).toBeTruthy()
  expect(screen.queryByText('Your account')).toBeNull()
  await user.clear(screen.getByLabelText('Full name'))
  await user.type(screen.getByLabelText('Full name'), 'Ada Updated')
  await user.click(screen.getByRole('button', { name: 'Save name' }))
  expect(await screen.findByText('Name updated.')).toBeTruthy()
  expect(auth.updateUser).toHaveBeenCalledWith({ name: 'Ada Updated' })
  expect(auth.refetch).toHaveBeenCalled()
})
