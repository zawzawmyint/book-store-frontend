import { useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery } from '@apollo/client/react'
import { AdminCustomerDocument, ResetCustomerPasswordDocument } from '../../../generated/graphql'
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

export function CustomerPage() {
  const { id = '' } = useParams()
  const { data: session } = authClient.useSession()
  const { handleError } = useAdminAccess()
  const { data, loading, error, refetch } = useQuery(AdminCustomerDocument, {
    variables: { id },
    fetchPolicy: 'no-cache',
  })
  useAdminQueryError(error)
  const location = useLocation()
  const requestedReturn = (location.state as { returnTo?: string } | null)?.returnTo
  const returnTo = requestedReturn?.startsWith('/admin/customers?')
    ? requestedReturn
    : '/admin/customers'
  const customer = data?.adminCustomer
  const [notice, setNotice] = useState('')
  const [copyError, setCopyError] = useState('')
  async function copyId() {
    if (!customer) return
    setCopyError('')
    setNotice('')
    try {
      await navigator.clipboard.writeText(customer.id)
      setNotice('User ID copied.')
    } catch {
      setCopyError('Unable to copy the user ID.')
    }
  }
  return (
    <section>
      <Link className="admin-back-link" to={returnTo}>
        Back to customers
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
      {!loading && !error && customer && (
        <>
          <AdminPageHeader title={customer.name} description="Registered account." />
          <dl className="mt-6 space-y-4 text-sm">
            <div>
              <dt className="text-xs font-bold uppercase tracking-[.14em] text-slate-500">Email</dt>
              <dd className="mt-1">{customer.email}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-[.14em] text-slate-500">Role</dt>
              <dd className="mt-1">{customer.role === 'ADMIN' ? 'Admin' : 'Customer'}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-[.14em] text-slate-500">Joined</dt>
              <dd className="mt-1">{new Date(customer.createdAt).toLocaleDateString()}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-[.14em] text-slate-500">User ID</dt>
              <dd className="mt-1 font-mono text-xs break-all">{customer.id}</dd>
            </div>
          </dl>
          <Button type="button" variant="ghost" className="mt-4" onClick={() => void copyId()}>
            Copy user ID
          </Button>
          {session?.user.id === customer.id ? (
            <p className="mt-8 text-sm">
              Change your own password from <Link to="/admin/profile">your profile</Link>.
            </p>
          ) : (
            <PasswordForm userId={customer.id} onError={handleError} onSaved={() => setNotice('Password set.')} />
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
  const [resetPassword] = useMutation(ResetCustomerPasswordDocument)
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
      if (!response.data?.resetCustomerPassword) throw new Error('Unable to set the password.')
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
      <p className="text-sm text-slate-500">
        The new password replaces the current one and signs this person out of every session.
      </p>
      <FormField
        id="customer-new-password"
        label="New password"
        type="password"
        autoComplete="new-password"
        required
        disabled={pending}
        {...form.register('newPassword')}
        error={form.formState.errors.newPassword?.message}
      />
      <FormField
        id="customer-confirm-password"
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
