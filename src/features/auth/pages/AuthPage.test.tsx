// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AuthPage } from './AuthPage'

const { login } = vi.hoisted(() => ({ login: vi.fn() }))
vi.mock('../../../lib/auth-client', () => ({
  authClient: {
    useSession: () => ({ data: null, isPending: false }),
    signIn: { email: login },
  },
}))
beforeEach(() => {
  vi.stubEnv('DEV', true)
  vi.stubEnv('VITE_DEMO_LOGIN', 'false')
})
afterEach(() => {
  cleanup()
  vi.unstubAllEnvs()
  vi.resetAllMocks()
})
function show(mode: 'sign-in' | 'sign-up' = 'sign-in') {
  render(
    <MemoryRouter initialEntries={['/sign-in?returnTo=/checkout']}>
      <Routes>
        <Route path="/sign-in" element={<AuthPage mode={mode} />} />
        <Route path="/" element={<p>Storefront destination</p>} />
        <Route path="/admin/books" element={<p>Workspace destination</p>} />
      </Routes>
    </MemoryRouter>,
  )
}
it.each(['Customer', 'Staff', 'Admin'])(
  'logs in Demo %s and uses its landing page',
  async (role) => {
    vi.stubEnv('VITE_DEMO_LOGIN', 'true')
    login.mockResolvedValue({ error: null })
    show()
    await userEvent.setup().click(screen.getByRole('button', { name: `Demo ${role}` }))
    expect(login).toHaveBeenCalledWith({
      email: `demo-${role.toLowerCase()}@example.com`,
      password: 'BookstoreDemo123!',
    })
    expect(
      await screen.findByText(
        role === 'Customer' ? 'Storefront destination' : 'Workspace destination',
      ),
    ).toBeTruthy()
  },
)
it('hides demo login unless enabled, including signup and production', () => {
  show()
  expect(screen.queryByRole('button', { name: 'Demo Admin' })).toBeNull()
  cleanup()
  vi.stubEnv('VITE_DEMO_LOGIN', 'true')
  show('sign-up')
  expect(screen.queryByRole('button', { name: 'Demo Admin' })).toBeNull()
  cleanup()
  vi.stubEnv('DEV', false)
  show()
  expect(screen.queryByRole('button', { name: 'Demo Admin' })).toBeNull()
})
it('disables login while pending and recovers after a network failure', async () => {
  vi.stubEnv('VITE_DEMO_LOGIN', 'true')
  let rejectLogin!: (error: Error) => void
  login.mockImplementation(
    () =>
      new Promise((_resolve, reject) => {
        rejectLogin = reject
      }),
  )
  show()
  await userEvent.setup().click(screen.getByRole('button', { name: 'Demo Admin' }))
  expect((screen.getByRole('button', { name: 'Sign in' }) as HTMLButtonElement).disabled).toBe(true)
  rejectLogin(new Error('Offline'))
  expect(await screen.findByText(/Unable to sign in to the demo account/)).toBeTruthy()
  expect((screen.getByRole('button', { name: 'Demo Staff' }) as HTMLButtonElement).disabled).toBe(
    false,
  )
})
