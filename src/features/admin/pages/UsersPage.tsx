import { errorMessage } from '../../../lib/i18n/errors'
import { formatDate } from '../../../lib/format'
import { localized, message as msg, t, useI18n } from '../../../lib/i18n'
import { useState } from 'react'
import { Copy, Eye } from 'lucide-react'
import { IconAction } from '../../../app/components/IconAction'
import { Link, useNavigate } from 'react-router-dom'
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
import { Alert, AlertDescription } from '../../../app/components/ui/alert'
import { accessErrorCode, useAdminAccess, useAdminQueryError } from '../admin-access'
import { useAdminPagination, useAdminPageCorrection } from '../use-admin-pagination'
import { AdminDialog } from '../components/AdminDialog'
import { AdminFeedback } from '../components/AdminFeedback'
import { AdminFilterToolbar } from '../components/AdminFilterToolbar'
import { AdminPageHeader } from '../components/AdminPageHeader'
import { AdminDataTable, type AdminDataColumn } from '../components/AdminPageTable'
import { EmailVerificationBadge } from '../components/EmailVerificationBadge'

function readRole(value: string | null): AdminUserRoleFilter {
  return value === 'CUSTOMER' || value === 'STAFF' || value === 'ADMIN' ? value : 'ALL'
}

export function UsersPage() {
  useI18n()

  const { params, page, limit, offset, changePage, changeParams } = useAdminPagination()
  const search = (params.get('search') ?? '').slice(0, 100)
  const role = readRole(params.get('role'))
  const { data: session } = authClient.useSession()
  const { handleError } = useAdminAccess()
  const { data, loading, error, refetch } = useQuery(AdminUsersDocument, {
    variables: {
      search,
      role,
      limit,
      offset,
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
  useAdminPageCorrection({ total: users?.total, loading })
  async function copyId(id: string) {
    setCopyError('')
    try {
      await navigator.clipboard.writeText(id)
      setNotice(msg('admin:userIdCopied'))
    } catch {
      setNotice('')
      setCopyError(msg('admin:unableToCopyTheUserId'))
    }
  }
  const columns: AdminDataColumn<AdminUserFieldsFragment>[] = [
    {
      id: 'name',
      label: t('common:labelName'),
      enableHiding: false,
      cell: (user) => (
        <>
          <bdi dir="auto">{localized(user.name)}</bdi>
        </>
      ),
    },
    {
      id: 'email',
      label: t('common:labelEmail'),
      cell: (user) => (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <span>
              <bdi dir="ltr">{localized(user.email)}</bdi>
            </span>
            <EmailVerificationBadge verified={user.emailVerified} />
          </div>
        </>
      ),
    },
    {
      id: 'role',
      label: t('common:labelRole'),
      cell: (user) => (
        <>
          {localized(
            user.role === 'ADMIN'
              ? t('admin:admin')
              : user.role === 'STAFF'
                ? t('admin:staff')
                : t('admin:customer'),
          )}
        </>
      ),
    },
    {
      id: 'joined',
      label: t('common:labelJoined'),
      cell: (user) => <>{localized(formatDate(new Date(user.createdAt)))}</>,
    },
    {
      id: 'id',
      label: t('common:labelUserID'),
      cell: (user) => (
        <>
          <span className="font-sans text-xs break-all">
            <bdi dir="ltr">{localized(user.id)}</bdi>
          </span>
        </>
      ),
    },
    {
      id: 'actions',
      label: t('common:labelActions'),
      enableHiding: false,
      cell: (user) => (
        <>
          <div className="flex flex-wrap gap-2">
            <IconAction asChild label={t('admin:viewUserValue', { value0: user.name })} workspace>
              <Link to={user.id} state={{ returnTo: `/admin/users?${params}` }}>
                <Eye aria-hidden="true" />
              </Link>
            </IconAction>
            <IconAction
              label={t('admin:copyUserIdForValue', { value0: user.name })}
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
              {t('admin:changeRole')}
            </Button>
          </div>
        </>
      ),
    },
  ]
  return (
    <section>
      <AdminPageHeader
        title={t('admin:users')}
        description={t('admin:registeredUsersManageCustomerStaffAndAdminRoles')}
      />
      {notice && (
        <Alert role="status" className="my-4">
          <AlertDescription>{localized(notice)}</AlertDescription>
        </Alert>
      )}
      {copyError && (
        <Alert role="alert" variant="destructive" className="my-4">
          <AlertDescription>{localized(copyError)}</AlertDescription>
        </Alert>
      )}
      <AdminFilterToolbar
        search={search}
        onSearch={(value) => changeParams({ search: value, page: '' })}
        searchLabel={t('admin:searchUsers')}
        searchPlaceholder={t('admin:nameOrEmail')}
      >
        <div className="admin-toolbar-field">
          <Label htmlFor="admin-user-role">{t('admin:role')}</Label>
          <Select
            value={role}
            onValueChange={(value) =>
              changeParams({ role: value === 'ALL' ? '' : value, page: '' })
            }
          >
            <SelectTrigger id="admin-user-role" className="min-w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="admin-workspace">
              <SelectItem value="ALL">{t('admin:all')}</SelectItem>
              <SelectItem value="CUSTOMER">{t('admin:customers')}</SelectItem>
              <SelectItem value="STAFF">{t('admin:staff')}</SelectItem>
              <SelectItem value="ADMIN">{t('admin:admins')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </AdminFilterToolbar>
      <AdminFeedback loading={loading} error={localized(error)} retry={refetch} />
      <div hidden={loading || !!error || !users}>
        <AdminDataTable
          columns={columns}
          items={users?.items ?? []}
          rowKey={(user) => user.id}
          label={t('admin:users2')}
          emptyMessage={t('admin:noAccountsMatch')}
          page={page}
          total={users?.total ?? 0}
          onPageChange={changePage}
          tableClassName="min-w-[880px]"
        />
      </div>
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
  useI18n()

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
      setError(errorMessage(failure, 'admin:unableToRefreshUsers'))
    } finally {
      setChecking(false)
    }
  }
  async function confirm() {
    setError('')
    try {
      const response = await changeAccess({ variables: { userId: user.id, role: selectedRole } })
      const updated = response.data?.setUserRole
      if (!updated) throw new Error(msg('admin:theResultIsUnknown'))
      if (isSelf && updated.role !== 'ADMIN') {
        await confirmRole(updated.role)
        retry()
        navigate(updated.role === 'STAFF' ? '/admin/books' : '/', { replace: true })
        return
      }
      saved(
        msg('admin:roleChanged', {
          value0: updated.name,
          value1: msg(
            updated.role === 'ADMIN'
              ? 'common:adminRole'
              : updated.role === 'STAFF'
                ? 'common:staffRole'
                : 'common:customerRole',
          ),
        }),
      )
    } catch (failure) {
      handleError(failure)
      if (accessErrorCode(failure)) {
        close()
        return
      }
      if (CombinedGraphQLErrors.is(failure)) {
        setError(errorMessage(failure, 'admin:unableToRefreshUsers'))
        await refresh().catch(() => {})
        return
      }
      setUnknown(true)
      setChecked(false)
      setError(msg('admin:theResultIsUnknownRefreshTheUserListBeforeConfirmingAgain'))
    }
  }
  return (
    <AdminDialog
      title={t('admin:changeRoleForValue', { value0: user.name })}
      close={close}
      busy={loading || checking}
      returnFocusTo={opener}
    >
      <div className="mb-4 space-y-3">
        <p>
          {t('admin:currentRoleValue', {
            value0: t(
              role === 'ADMIN'
                ? 'common:adminRole'
                : role === 'STAFF'
                  ? 'common:staffRole'
                  : 'common:customerRole',
            ),
          })}
        </p>
        <Label htmlFor="new-user-role">{t('admin:newRole')}</Label>
        <select
          id="new-user-role"
          className="w-full rounded-md border border-control bg-input text-foreground p-3"
          value={selectedRole}
          disabled={loading || checking}
          onChange={(event) => setSelectedRole(event.target.value as typeof role)}
        >
          <option value="CUSTOMER">{t('admin:customer')}</option>
          <option value="STAFF">{t('admin:staff')}</option>
          <option value="ADMIN">{t('admin:admin')}</option>
        </select>
        <p>
          {localized(
            selectedRole === 'ADMIN'
              ? t('admin:thisAccountWillBeAbleToOpenTheAdminWorkspaceAnd')
              : selectedRole === 'STAFF'
                ? t('admin:staffCanAddAndEditBooksChangePricesAdjustStockAnd')
                : t('admin:workspaceAccessEndsOnTheNextRequestTheUserAccountAnd'),
          )}
        </p>
        {selectedRole !== 'ADMIN' && isSelf && (
          <p>
            {t('admin:thisWillRemoveYourOwnAdminAccessValue', {
              value0:
                selectedRole === 'STAFF' ? msg('admin:selfStaffAccess') : msg('admin:selfNoAccess'),
            })}
          </p>
        )}
      </div>
      {error && (
        <Alert role="alert" variant="destructive" className="mb-4">
          <AlertDescription>{localized(error)}</AlertDescription>
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
            {t('admin:refreshUserList')}
          </Button>
          {checked && (
            <p role="status" className="mb-4 text-sm">
              {t('admin:theListWasRefreshedThisDoesNotConfirmWhetherTheEarlier')}
            </p>
          )}
        </>
      )}
      <Button
        type="button"
        disabled={selectedRole === role || loading || checking || (unknown && !checked)}
        onClick={() => void confirm()}
      >
        {localized(loading ? t('admin:saving') : t('admin:confirmRoleChange'))}
      </Button>
    </AdminDialog>
  )
}
