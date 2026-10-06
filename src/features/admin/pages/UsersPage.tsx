import { useEffect, useState } from 'react'
import { Copy, Eye } from 'lucide-react'
import { IconAction } from '../../../app/components/IconAction'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { CombinedGraphQLErrors } from '@apollo/client'
import { useMutation, useQuery } from '@apollo/client/react'
import {
  AdminUsersDocument,
  SetUserRoleDocument,
  type AdminUserFieldsFragment,
  type AdminUserRoleFilter,
} from '../../../generated/graphql'
import { authClient } from '../../../lib/auth-client'
import { Button } from '../../../app/components/ui/button'
import { Label } from '../../../app/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../app/components/ui/select'
import { TableCell } from '../../../app/components/ui/table'
import { Alert, AlertDescription } from '../../../app/components/ui/alert'
import { accessErrorCode, useAdminAccess, useAdminQueryError } from '../admin-access'
import { ADMIN_PAGE_SIZE, readPage } from '../admin-data'
import { AdminDialog } from '../components/AdminDialog'
import { AdminFeedback } from '../components/AdminFeedback'
import { AdminFilterToolbar } from '../components/AdminFilterToolbar'
import { AdminPageHeader } from '../components/AdminPageHeader'
import { AdminPageTable } from '../components/AdminPageTable'

function readRole(value: string | null): AdminUserRoleFilter {
  return value === 'CUSTOMER' || value === 'STAFF' || value === 'ADMIN' ? value : 'ALL'
}

export function UsersPage() {
  const [params, setParams] = useSearchParams()
  const search = (params.get('search') ?? '').slice(0, 100)
  const role = readRole(params.get('role'))
  const page = readPage(params.get('page'))
  const { data: session } = authClient.useSession()
  const { handleError } = useAdminAccess()
  const { data, loading, error, refetch } = useQuery(AdminUsersDocument, {
    variables: {
      search,
      role,
      limit: ADMIN_PAGE_SIZE,
      offset: (page - 1) * ADMIN_PAGE_SIZE,
    },
    fetchPolicy: 'no-cache',
  })
  useAdminQueryError(error)
  const [notice, setNotice] = useState('')
  const [copyError, setCopyError] = useState('')
  const [action, setAction] = useState<{
    user: AdminUserFieldsFragment
    role: AdminUserFieldsFragment['role']
    opener: HTMLButtonElement | null
  }>()
  const users = data?.adminUsers
  function change(values: Record<string, string>) {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(values)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    setParams(next)
  }
  useEffect(() => {
    if (users && !loading && page > Math.max(1, Math.ceil(users.total / ADMIN_PAGE_SIZE))) {
      const next = new URLSearchParams(params)
      next.set('page', String(Math.max(1, Math.ceil(users.total / ADMIN_PAGE_SIZE))))
      setParams(next, { replace: true })
    }
  }, [users, loading, page, params, setParams])
  async function copyId(id: string) {
    setCopyError('')
    try {
      await navigator.clipboard.writeText(id)
      setNotice('User ID copied.')
    } catch {
      setNotice('')
      setCopyError('Unable to copy the user ID.')
    }
  }
  return (
    <section>
      <AdminPageHeader
        title="Users"
        description="Registered users. Manage customer, staff, and admin roles."
      />
      {notice && (
        <Alert role="status" className="my-4">
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      )}
      {copyError && (
        <Alert role="alert" variant="destructive" className="my-4">
          <AlertDescription>{copyError}</AlertDescription>
        </Alert>
      )}
      <AdminFilterToolbar
        search={search}
        onSearch={(value) => change({ search: value, page: '' })}
        searchLabel="Search users"
        searchPlaceholder="Name or email"
      >
        <div className="admin-toolbar-field">
          <Label htmlFor="admin-user-role">Role</Label>
          <Select
            value={role}
            onValueChange={(value) => change({ role: value === 'ALL' ? '' : value, page: '' })}
          >
            <SelectTrigger id="admin-user-role" className="min-w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="admin-workspace">
              <SelectItem value="ALL">All</SelectItem>
              <SelectItem value="CUSTOMER">Customers</SelectItem>
              <SelectItem value="STAFF">Staff</SelectItem>
              <SelectItem value="ADMIN">Admins</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </AdminFilterToolbar>
      <AdminFeedback loading={loading} error={error} retry={refetch} />
      {!loading && !error && users && (
        <AdminPageTable
          columns={[
            { label: 'Name' },
            { label: 'Email' },
            { label: 'Role' },
            { label: 'Joined' },
            { label: 'User ID' },
            { label: 'Actions' },
          ]}
          items={users.items}
          rowKey={(user) => user.id}
          label="users"
          emptyMessage="No accounts match."
          page={page}
          total={users.total}
          onPageChange={(next) => change({ page: String(next) })}
          tableClassName="min-w-[880px]"
          renderRow={(user) => (
            <>
              <TableCell>{user.name}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>
                {user.role === 'ADMIN' ? 'Admin' : user.role === 'STAFF' ? 'Staff' : 'Customer'}
              </TableCell>
              <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
              <TableCell>
                <span className="font-sans text-xs break-all">{user.id}</span>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-2">
                  <IconAction asChild label={`View user ${user.name}`} workspace>
                    <Link to={user.id} state={{ returnTo: `/admin/users?${params}` }}>
                      <Eye aria-hidden="true" />
                    </Link>
                  </IconAction>
                  <IconAction
                    label={`Copy user ID for ${user.name}`}
                    workspace
                    onClick={() => void copyId(user.id)}
                  >
                    <Copy aria-hidden="true" />
                  </IconAction>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={(event) => {
                      setCopyError('')
                      setAction({
                        user,
                        role: user.role,
                        opener: event.currentTarget,
                      })
                    }}
                  >
                    Change role
                  </Button>
                </div>
              </TableCell>
            </>
          )}
        />
      )}
      {action && (
        <RoleDialog
          user={action.user}
          role={action.role}
          isSelf={session?.user.id === action.user.id}
          opener={action.opener}
          refresh={() => refetch()}
          close={() => setAction(undefined)}
          saved={(message) => {
            setNotice(message)
            setAction(undefined)
            void refetch().catch((failure) => handleError(failure))
          }}
        />
      )}
    </section>
  )
}

function RoleDialog({
  user,
  role,
  isSelf,
  opener,
  refresh,
  close,
  saved,
}: {
  user: AdminUserFieldsFragment
  role: AdminUserFieldsFragment['role']
  isSelf: boolean
  opener: HTMLButtonElement | null
  refresh: () => Promise<unknown>
  close: () => void
  saved: (message: string) => void
}) {
  const { handleError, retry, confirmRole } = useAdminAccess()
  const navigate = useNavigate()
  const [selectedRole, setSelectedRole] = useState(role)
  const [changeAccess, { loading }] = useMutation(SetUserRoleDocument)
  const [error, setError] = useState('')
  const [unknown, setUnknown] = useState(false)
  const [checked, setChecked] = useState(false)
  const [checking, setChecking] = useState(false)
  async function checkUsers() {
    setChecking(true)
    try {
      await refresh()
      setChecked(true)
    } catch (failure) {
      handleError(failure)
      if (accessErrorCode(failure)) {
        close()
        return
      }
      setError(failure instanceof Error ? failure.message : 'Unable to refresh users')
    } finally {
      setChecking(false)
    }
  }
  async function confirm() {
    setError('')
    try {
      const response = await changeAccess({ variables: { userId: user.id, role: selectedRole } })
      const updated = response.data?.setUserRole
      if (!updated) throw new Error('The result is unknown')
      if (isSelf && updated.role !== 'ADMIN') {
        await confirmRole(updated.role)
        retry()
        navigate(updated.role === 'STAFF' ? '/admin/books' : '/', { replace: true })
        return
      }
      saved(
        `${updated.name} is now ${updated.role === 'ADMIN' ? 'an admin' : updated.role === 'STAFF' ? 'a staff member' : 'a customer'}.`,
      )
    } catch (failure) {
      handleError(failure)
      if (accessErrorCode(failure)) {
        close()
        return
      }
      if (CombinedGraphQLErrors.is(failure)) {
        setError(failure.message)
        await refresh().catch(() => {})
        return
      }
      setUnknown(true)
      setChecked(false)
      setError('The result is unknown. Refresh the user list before confirming again.')
    }
  }
  return (
    <AdminDialog
      title={`Change role for ${user.name}?`}
      close={close}
      busy={loading || checking}
      returnFocusTo={opener}
    >
      <div className="mb-4 space-y-3">
        <p>Current role: {role === 'ADMIN' ? 'Admin' : role === 'STAFF' ? 'Staff' : 'Customer'}.</p>
        <Label htmlFor="new-user-role">New role</Label>
        <select
          id="new-user-role"
          className="w-full rounded-md border border-control bg-input text-foreground p-3"
          value={selectedRole}
          disabled={loading || checking}
          onChange={(event) => setSelectedRole(event.target.value as typeof role)}
        >
          <option value="CUSTOMER">Customer</option>
          <option value="STAFF">Staff</option>
          <option value="ADMIN">Admin</option>
        </select>
        <p>
          {selectedRole === 'ADMIN'
            ? 'This account will be able to open the admin workspace and can still shop as a customer.'
            : selectedRole === 'STAFF'
              ? 'Staff can add and edit books, change prices, adjust stock, and view orders. User management and archive/restore remain admin-only.'
              : 'Workspace access ends on the next request. The user account and existing order requests remain.'}
        </p>
        {selectedRole !== 'ADMIN' && isSelf && (
          <p>
            This will remove your own admin access.
            {selectedRole === 'STAFF'
              ? ' You will retain books and orders access, but lose user management and archive/restore.'
              : ' You will lose all workspace access.'}
          </p>
        )}
      </div>
      {error && (
        <Alert role="alert" variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {unknown && (
        <>
          <Button
            type="button"
            variant="ghost"
            disabled={checking}
            onClick={() => {
              void checkUsers()
            }}
          >
            Refresh user list
          </Button>
          {checked && (
            <p role="status" className="mb-4 text-sm">
              The list was refreshed. This does not confirm whether the earlier change ran. Review
              the account before confirming again.
            </p>
          )}
        </>
      )}
      <Button
        type="button"
        disabled={selectedRole === role || loading || checking || (unknown && !checked)}
        onClick={() => void confirm()}
      >
        {loading ? 'Saving…' : 'Confirm role change'}
      </Button>
    </AdminDialog>
  )
}
