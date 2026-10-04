import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CombinedGraphQLErrors } from '@apollo/client'
import { useMutation, useQuery } from '@apollo/client/react'
import {
  AdminCustomersDocument,
  SetCustomerAdminAccessDocument,
  type AdminCustomerFieldsFragment,
  type AdminCustomerRoleFilter,
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

function readRole(value: string | null): AdminCustomerRoleFilter {
  return value === 'CUSTOMER' || value === 'ADMIN' ? value : 'ALL'
}

export function CustomersPage() {
  const [params, setParams] = useSearchParams()
  const search = (params.get('search') ?? '').slice(0, 100)
  const role = readRole(params.get('role'))
  const page = readPage(params.get('page'))
  const { data: session } = authClient.useSession()
  const { handleError } = useAdminAccess()
  const { data, loading, error, refetch } = useQuery(AdminCustomersDocument, {
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
    customer: AdminCustomerFieldsFragment
    enabled: boolean
    opener: HTMLButtonElement | null
  }>()
  const customers = data?.adminCustomers
  function change(values: Record<string, string>) {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(values)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    setParams(next)
  }
  useEffect(() => {
    if (customers && !loading && page > Math.max(1, Math.ceil(customers.total / ADMIN_PAGE_SIZE))) {
      const next = new URLSearchParams(params)
      next.set('page', String(Math.max(1, Math.ceil(customers.total / ADMIN_PAGE_SIZE))))
      setParams(next, { replace: true })
    }
  }, [customers, loading, page, params, setParams])
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
        title="Customers"
        description="Registered accounts. Grant or revoke admin access from this page."
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
        searchLabel="Search customers"
        searchPlaceholder="Name or email"
      >
        <div className="admin-toolbar-field">
          <Label htmlFor="admin-customer-role">Role</Label>
          <Select
            value={role}
            onValueChange={(value) => change({ role: value === 'ALL' ? '' : value, page: '' })}
          >
            <SelectTrigger id="admin-customer-role" className="min-w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="admin-workspace">
              <SelectItem value="ALL">All</SelectItem>
              <SelectItem value="CUSTOMER">Customers</SelectItem>
              <SelectItem value="ADMIN">Admins</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </AdminFilterToolbar>
      <AdminFeedback loading={loading} error={error} retry={refetch} />
      {!loading && !error && customers && (
        <AdminPageTable
          columns={[
            { label: 'Name' },
            { label: 'Email' },
            { label: 'Role' },
            { label: 'Joined' },
            { label: 'User ID' },
            { label: 'Actions' },
          ]}
          items={customers.items}
          rowKey={(customer) => customer.id}
          label="customers"
          emptyMessage="No accounts match."
          page={page}
          total={customers.total}
          onPageChange={(next) => change({ page: String(next) })}
          tableClassName="min-w-[880px]"
          renderRow={(customer) => (
            <>
              <TableCell>{customer.name}</TableCell>
              <TableCell>{customer.email}</TableCell>
              <TableCell>{customer.role === 'ADMIN' ? 'Admin' : 'Customer'}</TableCell>
              <TableCell>{new Date(customer.createdAt).toLocaleDateString()}</TableCell>
              <TableCell>
                <span className="font-mono text-xs break-all">{customer.id}</span>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="ghost" asChild>
                    <Link to={customer.id} state={{ returnTo: `/admin/customers?${params}` }}>
                      View customer
                    </Link>
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => void copyId(customer.id)}>
                    Copy user ID
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={(event) => {
                      setCopyError('')
                      setAction({
                        customer,
                        enabled: customer.role !== 'ADMIN',
                        opener: event.currentTarget,
                      })
                    }}
                  >
                    {customer.role === 'ADMIN' ? 'Revoke admin' : 'Grant admin'}
                  </Button>
                </div>
              </TableCell>
            </>
          )}
        />
      )}
      {action && (
        <MembershipDialog
          customer={action.customer}
          enabled={action.enabled}
          self={session?.user.id === action.customer.id}
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

function MembershipDialog({
  customer,
  enabled,
  self,
  opener,
  refresh,
  close,
  saved,
}: {
  customer: AdminCustomerFieldsFragment
  enabled: boolean
  self: boolean
  opener: HTMLButtonElement | null
  refresh: () => Promise<unknown>
  close: () => void
  saved: (message: string) => void
}) {
  const { handleError } = useAdminAccess()
  const [changeAccess, { loading }] = useMutation(SetCustomerAdminAccessDocument)
  const [error, setError] = useState('')
  const [unknown, setUnknown] = useState(false)
  const [checked, setChecked] = useState(false)
  const [checking, setChecking] = useState(false)
  async function checkCustomers() {
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
      setError(failure instanceof Error ? failure.message : 'Unable to refresh customers')
    } finally {
      setChecking(false)
    }
  }
  async function confirm() {
    setError('')
    try {
      const response = await changeAccess({ variables: { userId: customer.id, enabled } })
      const updated = response.data?.setCustomerAdminAccess
      if (!updated) throw new Error('The result is unknown')
      saved(
        `${updated.name} is now ${updated.role === 'ADMIN' ? 'an admin' : 'a customer'}.`,
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
      setError('The result is unknown. Refresh the customer list before confirming again.')
    }
  }
  return (
    <AdminDialog
      title={`${enabled ? 'Grant' : 'Revoke'} admin for ${customer.name}?`}
      close={close}
      busy={loading || checking}
      returnFocusTo={opener}
    >
      <div className="mb-4 space-y-3">
        <p>
          {enabled
            ? 'This account will be able to open the admin workspace and can still shop as a customer.'
            : 'Admin access ends on the next request. The customer account and existing order requests remain.'}
        </p>
        {!enabled && self && <p>This will remove your own admin access.</p>}
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
              void checkCustomers()
            }}
          >
            Refresh customer list
          </Button>
          {checked && (
            <p role="status" className="mb-4 text-sm">
              The list was refreshed. This does not confirm whether the earlier change ran. Review
              the account before confirming again.
            </p>
          )}
        </>
      )}
      <Button type="button" disabled={loading || checking || (unknown && !checked)} onClick={() => void confirm()}>
        {loading ? 'Saving…' : `Confirm ${enabled ? 'grant' : 'revoke'}`}
      </Button>
    </AdminDialog>
  )
}
