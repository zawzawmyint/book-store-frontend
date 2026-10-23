import { errorMessage } from '../../../lib/i18n/errors'
import { formatDate } from '../../../lib/format'
import { localized, message as msg, t, useI18n } from '../../../lib/i18n'
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
import { EmailVerificationBadge } from '../components/EmailVerificationBadge'
import { adminListReturnTo } from '../activity-data'

const passwordSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, msg('admin:useAtLeast8Characters'))
      .max(128, msg('admin:use128CharactersOrFewer')),
    confirmPassword: z.string(),
  })
  .refine((fields) => fields.newPassword === fields.confirmPassword, {
    message: msg('admin:enterTheSamePasswordAgain'),
    path: ['confirmPassword'],
  })

type PasswordFields = z.infer<typeof passwordSchema>

export function UserPage() {
  useI18n()

  const { id = '' } = useParams()
  const { data: session } = authClient.useSession()
  const { handleError } = useAdminAccess()
  const { data, loading, error, refetch } = useQuery(AdminUserDocument, {
    variables: { id },
    fetchPolicy: 'no-cache',
  })
  useAdminQueryError(error)
  const location = useLocation()
  const returnTo = adminListReturnTo(
    (location.state as { returnTo?: unknown } | null)?.returnTo,
    'users',
  )
  const user = data?.adminUser
  const [notice, setNotice] = useState('')
  const [copyError, setCopyError] = useState('')
  async function copyId() {
    if (!user) return
    setCopyError('')
    setNotice('')
    try {
      await navigator.clipboard.writeText(user.id)
      setNotice(msg('admin:userIdCopied'))
    } catch {
      setCopyError(msg('admin:unableToCopyTheUserId'))
    }
  }
  return (
    <section>
      <Link className="admin-back-link" to={returnTo}>
        {t('admin:backToUsers')}
      </Link>
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
      <AdminFeedback loading={loading} error={localized(error)} retry={refetch} />
      {!loading && !error && user && (
        <>
          <AdminPageHeader
            title={localized(user.name)}
            description={t('admin:registeredAccount')}
          />
          <dl className="mt-6 space-y-4 text-sm">
            <div>
              <dt className="text-xs font-bold uppercase tracking-[.14em] text-muted-foreground">
                {t('admin:email')}
              </dt>
              <dd className="mt-1 flex flex-wrap items-center gap-2">
                <span>
                  <bdi dir="ltr">{localized(user.email)}</bdi>
                </span>
                <EmailVerificationBadge verified={user.emailVerified} />
              </dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-[.14em] text-muted-foreground">
                {t('admin:role')}
              </dt>
              <dd className="mt-1">
                {localized(
                  user.role === 'ADMIN'
                    ? t('admin:admin')
                    : user.role === 'STAFF'
                      ? t('admin:staff')
                      : t('admin:customer'),
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-[.14em] text-muted-foreground">
                {t('admin:joined')}
              </dt>
              <dd className="mt-1">{localized(formatDate(new Date(user.createdAt)))}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-[.14em] text-muted-foreground">
                {t('admin:userId')}
              </dt>
              <dd className="mt-1 font-sans text-xs break-all">
                <bdi dir="ltr">{localized(user.id)}</bdi>
              </dd>
            </div>
          </dl>
          <IconAction
            label={t('admin:copyUserIdForValue', { value0: user.name })}
            workspace
            className="mt-4"
            onClick={() => void copyId()}
          >
            <Copy aria-hidden="true" />
          </IconAction>
          {session?.user.id === user.id ? (
            <p className="mt-8 text-sm">
              {t('admin:changeYourOwnPasswordFrom')}{' '}
              <Link to="/admin/profile">{t('admin:yourProfile2')}</Link>.
            </p>
          ) : (
            <PasswordForm
              userId={user.id}
              onError={handleError}
              onSaved={() => setNotice(msg('admin:passwordSet'))}
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
  useI18n()

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
      if (!response.data?.resetUserPassword) throw new Error(msg('admin:unableToSetThePassword'))
      form.reset()
      onSaved()
    } catch (failure) {
      onError(failure)
      if (accessErrorCode(failure)) return
      setError(errorMessage(failure, 'admin:unableToSetThePassword'))
    }
  }
  const pending = form.formState.isSubmitting
  return (
    <form noValidate onSubmit={form.handleSubmit(save)} className="mt-10 max-w-md space-y-5">
      <h3 className="text-lg font-semibold">{t('admin:setPassword')}</h3>
      <p className="text-sm text-muted-foreground">
        {t('admin:theNewPasswordReplacesTheCurrentOneAndSignsThisPerson')}
      </p>
      <FormField
        id="user-new-password"
        label={t('admin:newPassword')}
        type="password"
        autoComplete="new-password"
        required
        disabled={pending}
        {...form.register('newPassword')}
        error={localized(form.formState.errors.newPassword?.message)}
      />
      <FormField
        id="user-confirm-password"
        label={t('admin:confirmNewPassword')}
        type="password"
        autoComplete="new-password"
        required
        disabled={pending}
        {...form.register('confirmPassword')}
        error={localized(form.formState.errors.confirmPassword?.message)}
      />
      {error && (
        <Alert role="alert" variant="destructive">
          <AlertDescription>{localized(error)}</AlertDescription>
        </Alert>
      )}
      <Button type="submit" disabled={pending}>
        {localized(pending ? t('admin:setting') : t('admin:setPassword'))}
      </Button>
    </form>
  )
}
