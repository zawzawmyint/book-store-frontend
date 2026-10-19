import { errorMessage } from '../../lib/i18n/errors'
import { formatDate } from '../../lib/format'
import { localized, message as msg, t, useI18n } from '../../lib/i18n'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { authClient } from '../../lib/auth-client'
import { FormField } from '../../app/components/FormField'
import { Button } from '../../app/components/ui/button'
import { Alert, AlertDescription } from '../../app/components/ui/alert'

const nameSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, msg('storefront:enterYourName'))
    .max(120, msg('storefront:use120CharactersOrFewer')),
})
const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, msg('storefront:enterYourCurrentPassword')),
    newPassword: z
      .string()
      .min(8, msg('storefront:useAtLeast8Characters'))
      .max(128, msg('storefront:use128CharactersOrFewer')),
    confirmPassword: z.string(),
  })
  .refine((fields) => fields.newPassword === fields.confirmPassword, {
    message: msg('storefront:enterTheSamePasswordAgain'),
    path: ['confirmPassword'],
  })

type NameFields = z.infer<typeof nameSchema>
type PasswordFields = z.infer<typeof passwordSchema>

export function AccountProfile({ tone }: { tone: 'store' | 'admin' }) {
  useI18n()

  const { data: session, refetch } = authClient.useSession()
  const user = session?.user
  const [nameMessage, setNameMessage] = useState('')
  const [nameError, setNameError] = useState('')
  const [passwordMessage, setPasswordMessage] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const nameForm = useForm<NameFields>({
    resolver: zodResolver(nameSchema),
    defaultValues: { name: user?.name ?? '' },
  })
  const passwordForm = useForm<PasswordFields>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  })
  const alertClass =
    tone === 'store' ? 'border-destructive bg-destructive-muted text-destructive' : undefined
  const labelClass =
    tone === 'store'
      ? 'text-xs font-bold uppercase tracking-[.14em] text-muted-foreground'
      : 'text-xs font-bold uppercase tracking-[.14em] text-muted-foreground'

  async function saveName(fields: NameFields) {
    setNameError('')
    setNameMessage('')
    const result = await authClient.updateUser({ name: fields.name })
    if (result.error) {
      setNameError(errorMessage(result.error, 'storefront:unableToUpdateYourName'))
      return
    }
    await refetch()
    setNameMessage(msg('storefront:nameUpdated'))
  }

  async function savePassword(fields: PasswordFields) {
    setPasswordError('')
    setPasswordMessage('')
    const result = await authClient.changePassword({
      currentPassword: fields.currentPassword,
      newPassword: fields.newPassword,
      revokeOtherSessions: true,
    })
    if (result.error) {
      setPasswordError(errorMessage(result.error, 'storefront:unableToChangeYourPassword'))
      return
    }
    passwordForm.reset()
    setPasswordMessage(msg('storefront:passwordChanged'))
  }

  if (!user) return null
  return (
    <>
      <dl className="mt-8 space-y-4 text-sm">
        <div>
          <dt className={labelClass}>{t('storefront:email')}</dt>
          <dd className="mt-1">
            <bdi dir="ltr">{localized(user.email)}</bdi>
          </dd>
        </div>
        <div>
          <dt className={labelClass}>{t('storefront:memberSince')}</dt>
          <dd className="mt-1">{localized(formatDate(new Date(user.createdAt)))}</dd>
        </div>
      </dl>
      <form
        noValidate
        onSubmit={nameForm.handleSubmit(saveName)}
        className="mt-10 max-w-md space-y-5"
      >
        <FormField
          id="profile-name"
          label={t('storefront:fullName')}
          autoComplete="name"
          required
          maxLength={120}
          {...nameForm.register('name')}
          error={localized(nameForm.formState.errors.name?.message)}
        />
        {nameError && (
          <Alert role="alert" variant="destructive" className={alertClass}>
            <AlertDescription>{localized(nameError)}</AlertDescription>
          </Alert>
        )}
        {nameMessage && (
          <Alert role="status">
            <AlertDescription>{localized(nameMessage)}</AlertDescription>
          </Alert>
        )}
        <Button type="submit" disabled={nameForm.formState.isSubmitting}>
          {localized(
            nameForm.formState.isSubmitting ? t('storefront:saving') : t('storefront:saveName'),
          )}
        </Button>
      </form>
      <form
        noValidate
        onSubmit={passwordForm.handleSubmit(savePassword)}
        className="mt-12 max-w-md space-y-5"
      >
        <h2 className={tone === 'store' ? 'font-serif text-3xl' : 'text-lg font-semibold'}>
          {t('storefront:changePassword')}
        </h2>
        <FormField
          id="profile-current-password"
          label={t('storefront:currentPassword')}
          type="password"
          autoComplete="current-password"
          required
          disabled={passwordForm.formState.isSubmitting}
          {...passwordForm.register('currentPassword')}
          error={localized(passwordForm.formState.errors.currentPassword?.message)}
        />
        <FormField
          id="profile-new-password"
          label={t('storefront:newPassword')}
          type="password"
          autoComplete="new-password"
          required
          disabled={passwordForm.formState.isSubmitting}
          {...passwordForm.register('newPassword')}
          error={localized(passwordForm.formState.errors.newPassword?.message)}
        />
        <FormField
          id="profile-confirm-password"
          label={t('storefront:confirmNewPassword')}
          type="password"
          autoComplete="new-password"
          required
          disabled={passwordForm.formState.isSubmitting}
          {...passwordForm.register('confirmPassword')}
          error={localized(passwordForm.formState.errors.confirmPassword?.message)}
        />
        {passwordError && (
          <Alert role="alert" variant="destructive" className={alertClass}>
            <AlertDescription>{localized(passwordError)}</AlertDescription>
          </Alert>
        )}
        {passwordMessage && (
          <Alert role="status">
            <AlertDescription>{localized(passwordMessage)}</AlertDescription>
          </Alert>
        )}
        <Button type="submit" disabled={passwordForm.formState.isSubmitting}>
          {localized(
            passwordForm.formState.isSubmitting
              ? t('storefront:changing')
              : t('storefront:changePassword'),
          )}
        </Button>
      </form>
    </>
  )
}
