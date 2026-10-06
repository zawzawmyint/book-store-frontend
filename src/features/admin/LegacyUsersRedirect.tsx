import { Navigate, useLocation, useParams } from 'react-router-dom'

export function LegacyUsersRedirect() {
  const { id } = useParams()
  const location = useLocation()
  return (
    <Navigate
      replace
      to={{
        pathname: id ? `/admin/users/${encodeURIComponent(id)}` : '/admin/users',
        search: location.search,
        hash: location.hash,
      }}
      state={location.state}
    />
  )
}
