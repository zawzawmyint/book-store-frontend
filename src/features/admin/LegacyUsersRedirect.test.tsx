// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  MemoryRouter,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useNavigationType,
} from 'react-router-dom'
import { LegacyUsersRedirect } from './LegacyUsersRedirect'

afterEach(cleanup)

function Destination() {
  const location = useLocation()
  const navigate = useNavigate()
  const navigationType = useNavigationType()
  return (
    <>
      <p>
        {location.pathname}
        {location.search}
        {location.hash}
      </p>
      <p>{navigationType}</p>
      <p>{JSON.stringify(location.state)}</p>
      <button onClick={() => navigate(-1)}>Back</button>
    </>
  )
}

it.each([
  ['/admin/customers', '/admin/users'],
  ['/admin/customers/reader%20one', '/admin/users/reader%20one'],
])(
  'replaces legacy %s while preserving filters, IDs and return state',
  async (oldPath, newPath) => {
    const search = '?search=Ada%20Reader&role=CUSTOMER&page=2'
    const state = { returnTo: `/admin/customers${search}` }
    render(
      <MemoryRouter
        initialEntries={['/previous', { pathname: oldPath, search, hash: '#details', state }]}
        initialIndex={1}
      >
        <Routes>
          <Route path="/previous" element={<p>Previous page</p>} />
          <Route path="/admin/customers" element={<LegacyUsersRedirect />} />
          <Route path="/admin/customers/:id" element={<LegacyUsersRedirect />} />
          <Route path="/admin/users" element={<Destination />} />
          <Route path="/admin/users/:id" element={<Destination />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(await screen.findByText(`${newPath}${search}#details`)).toBeTruthy()
    expect(screen.getByText('REPLACE')).toBeTruthy()
    expect(screen.getByText(JSON.stringify(state))).toBeTruthy()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Back' }))
    expect(await screen.findByText('Previous page')).toBeTruthy()
  },
)
