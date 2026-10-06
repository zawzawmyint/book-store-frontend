import { useState } from 'react'
import { Copy } from 'lucide-react'
import { IconAction } from '../../../app/components/IconAction'
import { Link, useLocation, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery } from '@apollo/client/react'
import { AdminUserDocument, ResetUserPasswordDocument } from '../../../generated/graphql'
import { authClient } from '../../../lib/auth-client'
import { FormField } from '../../../app/components/FormField'
import { Button } from '../../../app/components/ui/button'
import { Alert, AlertDescription } from '../../../app/components/ui/alert'
import { accessErrorCode, useAdminAccess, useAdminQueryError } from '../admin-access'
import { AdminFeedback } from '../components/AdminFeedback'
import { AdminPageHeader } from '../components/AdminPageHeader'

const passwordSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, 'Use at least 8 characters.')
      .max(128, 'Use 128 characters or fewer.'),
    confirmPassword: z.string(),
  })
  .refine((fields) => fields.newPassword === fields.confirmPassword, {
    message: 'Enter the same password again.',
    path: ['confirmPassword'],
  })

type PasswordFields = z.infer<typeof passwordSchema>

export function UserPage() {
  const { id = '' } = useParams()
  const { data: session } = authClient.useSession()
  const { handleError } = useAdminAccess()
  const { data, loading, error, refetch } = useQuery(AdminUserDocument, {
    variables: { id },
    fetchPolicy: 'no-cache',
  })
  useAdminQueryError(error)
  const location = useLocation()
  const requestedReturn = (location.state as { returnTo?: string } | null)?.returnTo
  const returnTo = requestedReturn?.startsWith('/admin/users?')
    ? requestedReturn
    : requestedReturn?.startsWith('/admin/customers?')
      ? `/admin/users${requestedReturn.slice('/admin/customers'.length)}`
      : '/admin/users'
  const user = data?.adminUser
  const [notice, setNotice] = useState('')
  const [copyError, setCopyError] = useState('')
  async function copyId() {
    if (!user) return
    setCopyError('')
    setNotice('')
    try {
      await navigator.clipboard.writeText(user.id)
      setNotice('User ID copied.')
    } catch {
      setCopyError('Unable to copy the user ID.')
    }
  }
  return (
    <section>
      <Link className="admin-back-link" to={returnTo}>
        Back to users
      </Link>
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
      <AdminFeedback loading={loading} error={error} retry={refetch} />
      {!loading && !error && user && (
        <>
          <AdminPageHeader title={user.name} description="Registered account." />
          <dl className="mt-6 space-y-4 text-sm">
            <div>
              <dt className="text-xs font-bold uppercase tracking-[.14em] text-muted-foreground">
                Email
              </dt>
              <dd className="mt-1">{user.email}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-[.14em] text-muted-foreground">
                Role
              </dt>
              <dd className="mt-1">
                {user.role === 'ADMIN' ? 'Admin' : user.role === 'STAFF' ? 'Staff' : 'Customer'}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-[.14em] text-muted-foreground">
                Joined
              </dt>
              <dd className="mt-1">{new Date(user.createdAt).toLocaleDateString()}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-[.14em] text-muted-foreground">
                User ID
              </dt>
              <dd className="mt-1 font-sans text-xs break-all">{user.id}</dd>
            </div>
          </dl>
          <IconAction
            label={`Copy user ID for ${user.name}`}
            workspace
            className="mt-4"
            onClick={() => void copyId()}
          >
            <Copy aria-hidden="true" />
          </IconAction>
          {session?.user.id === user.id ? (
            <p className="mt-8 text-sm">
              Change your own password from <Link to="/admin/profile">your profile</Link>.
            </p>
          ) : (
            <PasswordForm
              userId={user.id}
              onError={handleError}
              onSaved={() => setNotice('Password set.')}
            />
          )}
        </>
      )}
    </section>
  )
}

function PasswordForm({
  userId,
  onError,
  onSaved,
}: {
  userId: string
  onError: (error: unknown) => void
  onSaved: () => void
}) {
  const [resetPassword] = useMutation(ResetUserPasswordDocument)
  const [error, setError] = useState('')
  const form = useForm<PasswordFields>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  })
  async function save(fields: PasswordFields) {
    setError('')
    try {
      const response = await resetPassword({
        variables: { userId, newPassword: fields.newPassword },
      })
      if (!response.data?.resetUserPassword) throw new Error('Unable to set the password.')
      form.reset()
      onSaved()
    } catch (failure) {
      onError(failure)
      if (accessErrorCode(failure)) return
      setError(failure instanceof Error ? failure.message : 'Unable to set the password.')
    }
  }
  const pending = form.formState.isSubmitting
  return (
    <form noValidate onSubmit={form.handleSubmit(save)} className="mt-10 max-w-md space-y-5">
      <h3 className="text-lg font-semibold">Set password</h3>
      <p className="text-sm text-muted-foreground">
        The new password replaces the current one and signs this person out of every session.
      </p>
      <FormField
        id="user-new-password"
        label="New password"
        type="password"
        autoComplete="new-password"
        required
        disabled={pending}
        {...form.register('newPassword')}
        error={form.formState.errors.newPassword?.message}
      />
      <FormField
        id="user-confirm-password"
        label="Confirm new password"
        type="password"
        autoComplete="new-password"
        required
        disabled={pending}
        {...form.register('confirmPassword')}
        error={form.formState.errors.confirmPassword?.message}
      />
      {error && (
        <Alert role="alert" variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? 'Setting…' : 'Set password'}
      </Button>
    </form>
  )
}
