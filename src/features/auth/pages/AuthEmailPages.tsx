import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { authClient } from '../../../lib/auth-client'
import { authEmailCallback, authEmailPath, safeReturnTo, signInPath } from '../return-to'
import { PageContainer } from '../../../app/components/PageContainer'
import { FormField } from '../../../app/components/FormField'
import { Button } from '../../../app/components/ui/button'
import { Alert, AlertDescription } from '../../../app/components/ui/alert'

const emailSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email('Enter a valid email address.').max(254, 'Use 254 characters or fewer.')),
})
const passwordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Use at least 8 characters.')
      .max(128, 'Use 128 characters or fewer.'),
    confirmation: z.string(),
  })
  .refine((fields) => fields.password === fields.confirmation, {
    message: 'Passwords must match.',
    path: ['confirmation'],
  })
const acceptedMessage =
  'If this address is eligible, an email has been requested. Check your inbox and spam folder.'

function EmailShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <PageContainer className="mx-auto max-w-xl py-16 sm:py-24">
      <p className="eyebrow mb-3">Your account</p>
      <h1 className="font-serif text-4xl sm:text-5xl">{title}</h1>
      <div className="mt-6 space-y-5 text-sm leading-6">{children}</div>
    </PageContainer>
  )
}
function Feedback({ error, message }: { error: string; message: string }) {
  return (
    <>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {message && <p role="status">{message}</p>}
    </>
  )
}

function EmailRequestPage({ recovery }: { recovery: boolean }) {
  const [params] = useSearchParams()
  const returnTo = safeReturnTo(params.get('returnTo'))
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [cooldown, setCooldown] = useState(0)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof emailSchema>>({ resolver: zodResolver(emailSchema) })
  useEffect(() => {
    if (!cooldown) return
    const timer = window.setTimeout(() => setCooldown((seconds) => Math.max(0, seconds - 1)), 1000)
    return () => window.clearTimeout(timer)
  }, [cooldown])
  async function submit({ email }: z.infer<typeof emailSchema>) {
    if (cooldown) return
    setError('')
    setMessage('')
    let retryAfter = 60
    const fetchOptions = {
      onResponse: ({ response }: { response: Response }) => {
        const header = response.headers.get('Retry-After') ?? response.headers.get('X-Retry-After')
        if (header) {
          const seconds = Number(header)
          const parsed = Number.isFinite(seconds)
            ? seconds
            : (Date.parse(header) - Date.now()) / 1000
          if (Number.isFinite(parsed)) retryAfter = Math.max(1, Math.ceil(parsed))
        }
      },
    }
    try {
      const result = recovery
        ? await authClient.requestPasswordReset(
            { email, redirectTo: authEmailCallback('/reset-password', returnTo) },
            fetchOptions,
          )
        : await authClient.sendVerificationEmail(
            { email, callbackURL: authEmailCallback('/verification-result', returnTo) },
            fetchOptions,
          )
      if (result.error) {
        if (result.error.status === 429) {
          setCooldown(retryAfter)
          setError('Too many requests. Wait before trying again.')
        } else setError('Unable to request an email. Please try again.')
        return
      }
      setMessage(acceptedMessage)
      if (!recovery) setCooldown(60)
    } catch {
      setError('Unable to connect. Check your connection and try again.')
    }
  }
  return (
    <EmailShell title={recovery ? 'Forgot password?' : 'Check your email'}>
      <p>
        {recovery
          ? 'Request a link to choose a new password.'
          : 'Use the verification link before signing in. Links expire after one hour. You can request another email below.'}
      </p>
      <form noValidate onSubmit={handleSubmit(submit)} className="space-y-5">
        <FormField
          id="email-request"
          label="Email address"
          type="email"
          autoComplete="email"
          required
          maxLength={254}
          {...register('email')}
          error={errors.email?.message}
        />
        <Feedback error={error} message={message} />
        <Button type="submit" disabled={isSubmitting || cooldown > 0} className="w-full">
          {isSubmitting
            ? 'Please wait…'
            : cooldown > 0
              ? `Resend in ${cooldown}s`
              : recovery
                ? 'Request reset link'
                : 'Resend verification email'}
        </Button>
      </form>
      <Link className="text-primary underline" to={signInPath(returnTo)}>
        Sign in
      </Link>
    </EmailShell>
  )
}
export function CheckEmailPage() {
  return <EmailRequestPage recovery={false} />
}
export function ForgotPasswordPage() {
  return <EmailRequestPage recovery />
}

export function VerificationResultPage() {
  const [params] = useSearchParams()
  const returnTo = safeReturnTo(params.get('returnTo'))
  const failed = params.has('error')
  return (
    <EmailShell title={failed ? 'Verification link unavailable' : 'Email verification'}>
      <p>
        {failed
          ? 'This link is invalid or expired. Request a new verification email to continue.'
          : 'Sign in to check your account and continue. If your email still needs verification, you can request a new link there.'}
      </p>
      <Link
        className="text-primary underline"
        to={failed ? authEmailPath('/check-email', returnTo) : signInPath(returnTo)}
      >
        {failed ? 'Request a verification email' : 'Sign in'}
      </Link>
    </EmailShell>
  )
}

export function ResetPasswordPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const returnTo = safeReturnTo(params.get('returnTo'))
  const token = params.get('token')
  const [done, setDone] = useState(false)
  const [invalid, setInvalid] = useState(!token || params.has('error'))
  const [error, setError] = useState('')
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof passwordSchema>>({ resolver: zodResolver(passwordSchema) })
  async function submit({ password }: z.infer<typeof passwordSchema>) {
    setError('')
    try {
      const result = await authClient.resetPassword({ newPassword: password, token: token ?? '' })
      if (result.error) {
        if (result.error.status === 429) setError('Too many requests. Wait before trying again.')
        else if (result.error.status >= 500)
          setError('Unable to reset your password. Please try again.')
        else setInvalid(true)
        return
      }
      setDone(true)
      navigate(authEmailPath('/reset-password', returnTo), { replace: true })
    } catch {
      setError('Unable to connect. Check your connection and try again.')
    }
  }
  return (
    <EmailShell
      title={done ? 'Password reset' : invalid ? 'Reset link unavailable' : 'Choose a new password'}
    >
      {done ? (
        <>
          <p>Your password has been updated. Sign in with your new password.</p>
          <Link className="text-primary underline" to={signInPath(returnTo)}>
            Sign in
          </Link>
        </>
      ) : invalid ? (
        <>
          <p>This reset link is invalid, expired, or already used.</p>
          <Link className="text-primary underline" to={authEmailPath('/forgot-password', returnTo)}>
            Request a new reset link
          </Link>
        </>
      ) : (
        <form noValidate onSubmit={handleSubmit(submit)} className="space-y-5">
          <FormField
            id="reset-password"
            label="New password"
            type="password"
            autoComplete="new-password"
            required
            maxLength={128}
            {...register('password')}
            error={errors.password?.message}
          />
          <FormField
            id="reset-confirmation"
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            required
            maxLength={128}
            {...register('confirmation')}
            error={errors.confirmation?.message}
          />
          <Feedback error={error} message="" />
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? 'Please wait…' : 'Reset password'}
          </Button>
        </form>
      )}
    </EmailShell>
  )
}
