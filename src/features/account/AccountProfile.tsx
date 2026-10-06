import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { authClient } from '../../lib/auth-client'
import { FormField } from '../../app/components/FormField'
import { Button } from '../../app/components/ui/button'
import { Alert, AlertDescription } from '../../app/components/ui/alert'

const nameSchema = z.object({
  name: z.string().trim().min(1, 'Enter your name.').max(120, 'Use 120 characters or fewer.'),
})
const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password.'),
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

type NameFields = z.infer<typeof nameSchema>
type PasswordFields = z.infer<typeof passwordSchema>

export function AccountProfile({ tone }: { tone: 'store' | 'admin' }) {
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
      setNameError(result.error.message || 'Unable to update your name.')
      return
    }
    await refetch()
    setNameMessage('Name updated.')
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
      setPasswordError(result.error.message || 'Unable to change your password.')
      return
    }
    passwordForm.reset()
    setPasswordMessage('Password changed.')
  }

  if (!user) return null
  return (
    <>
      <dl className="mt-8 space-y-4 text-sm">
        <div>
          <dt className={labelClass}>Email</dt>
          <dd className="mt-1">{user.email}</dd>
        </div>
        <div>
          <dt className={labelClass}>Member since</dt>
          <dd className="mt-1">{new Date(user.createdAt).toLocaleDateString()}</dd>
        </div>
      </dl>
      <form noValidate onSubmit={nameForm.handleSubmit(saveName)} className="mt-10 max-w-md space-y-5">
        <FormField
          id="profile-name"
          label="Full name"
          autoComplete="name"
          required
          maxLength={120}
          {...nameForm.register('name')}
          error={nameForm.formState.errors.name?.message}
        />
        {nameError && (
          <Alert role="alert" variant="destructive" className={alertClass}>
            <AlertDescription>{nameError}</AlertDescription>
          </Alert>
        )}
        {nameMessage && (
          <Alert role="status">
            <AlertDescription>{nameMessage}</AlertDescription>
          </Alert>
        )}
        <Button type="submit" disabled={nameForm.formState.isSubmitting}>
          {nameForm.formState.isSubmitting ? 'Saving…' : 'Save name'}
        </Button>
      </form>
      <form noValidate onSubmit={passwordForm.handleSubmit(savePassword)} className="mt-12 max-w-md space-y-5">
        <h2 className={tone === 'store' ? 'font-serif text-3xl' : 'text-lg font-semibold'}>
          Change password
        </h2>
        <FormField
          id="profile-current-password"
          label="Current password"
          type="password"
          autoComplete="current-password"
          required
          disabled={passwordForm.formState.isSubmitting}
          {...passwordForm.register('currentPassword')}
          error={passwordForm.formState.errors.currentPassword?.message}
        />
        <FormField
          id="profile-new-password"
          label="New password"
          type="password"
          autoComplete="new-password"
          required
          disabled={passwordForm.formState.isSubmitting}
          {...passwordForm.register('newPassword')}
          error={passwordForm.formState.errors.newPassword?.message}
        />
        <FormField
          id="profile-confirm-password"
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          required
          disabled={passwordForm.formState.isSubmitting}
          {...passwordForm.register('confirmPassword')}
          error={passwordForm.formState.errors.confirmPassword?.message}
        />
        {passwordError && (
          <Alert role="alert" variant="destructive" className={alertClass}>
            <AlertDescription>{passwordError}</AlertDescription>
          </Alert>
        )}
        {passwordMessage && (
          <Alert role="status">
            <AlertDescription>{passwordMessage}</AlertDescription>
          </Alert>
        )}
        <Button type="submit" disabled={passwordForm.formState.isSubmitting}>
          {passwordForm.formState.isSubmitting ? 'Changing…' : 'Change password'}
        </Button>
      </form>
    </>
  )
}
