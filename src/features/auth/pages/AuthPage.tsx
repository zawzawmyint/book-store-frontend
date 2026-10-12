import { useState } from 'react'
import { BookOpen, ShieldCheck, Store } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { authClient } from '../../../lib/auth-client'
import { authEmailCallback, authEmailPath, safeReturnTo } from '../return-to'
import { PageContainer } from '../../../app/components/PageContainer'
import { FormField } from '../../../app/components/FormField'
import { Button } from '../../../app/components/ui/button'
import { Alert, AlertDescription } from '../../../app/components/ui/alert'

const schema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Enter your name.')
    .max(120, 'Use 120 characters or fewer.')
    .optional(),
  email: z.email('Enter a valid email address.').max(254, 'Use 254 characters or fewer.'),
  password: z
    .string()
    .min(8, 'Use at least 8 characters.')
    .max(128, 'Use 128 characters or fewer.'),
})
type Fields = z.infer<typeof schema>

const demoAccounts = [
  { role: 'Customer', icon: BookOpen, description: 'Browse books' },
  { role: 'Staff', icon: Store, description: 'Manage the store' },
  { role: 'Admin', icon: ShieldCheck, description: 'Explore all tools' },
] as const

export function AuthPage({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const returnTo = safeReturnTo(params.get('returnTo'))
  const { data: session, isPending: sessionPending } = authClient.useSession()
  const [serverError, setServerError] = useState('')
  const [needsVerification, setNeedsVerification] = useState(false)
  const [demoPending, setDemoPending] = useState(false)
  const [demoTarget, setDemoTarget] = useState<string | null>(null)
  const demoEnabled =
    import.meta.env.DEV &&
    import.meta.env.VITE_DEMO_LOGIN === 'true' &&
    ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Fields>({ resolver: zodResolver(schema) })

  async function submit(fields: Fields) {
    if (demoPending) return
    if (mode === 'sign-up' && !fields.name?.trim()) {
      setError('name', { message: 'Enter your name.' })
      return
    }
    setServerError('')
    try {
      const result =
        mode === 'sign-up'
          ? await authClient.signUp.email({
              name: fields.name?.trim() || '',
              email: fields.email.trim().toLowerCase(),
              password: fields.password,
              callbackURL: authEmailCallback('/verification-result', returnTo),
            })
          : await authClient.signIn.email({
              email: fields.email.trim().toLowerCase(),
              password: fields.password,
            })
      if (result.error) {
        const unverified = result.error.code === 'EMAIL_NOT_VERIFIED'
        setNeedsVerification(unverified)
        setServerError(
          result.error.status === 429
            ? 'Too many attempts. Wait before trying again.'
            : unverified
              ? 'Verify your email before signing in.'
              : 'Unable to continue. Check your details and try again.',
        )
        return
      }
      navigate(mode === 'sign-up' ? authEmailPath('/check-email', returnTo) : returnTo, {
        replace: true,
      })
    } catch {
      setServerError('Unable to connect. Check your connection and try again.')
    }
  }

  async function signInDemo(role: 'Customer' | 'Staff' | 'Admin') {
    if (demoPending || isSubmitting) return
    const target = role === 'Customer' ? '/' : '/admin'
    setDemoPending(true)
    setDemoTarget(target)
    setServerError('')
    try {
      const result = await authClient.signIn.email({
        email: `demo-${role.toLowerCase()}@example.com`,
        password: 'BookstoreDemo123!',
      })
      if (result.error) throw new Error('Demo sign-in failed')
      navigate(target, { replace: true })
    } catch {
      setDemoTarget(null)
      setServerError(
        'Unable to sign in to the demo account. Check the API connection and run bun run demo:seed in the backend, then retry.',
      )
    } finally {
      setDemoPending(false)
    }
  }

  if (sessionPending)
    return (
      <div role="status" className="py-24 text-center">
        Loading your account…
      </div>
    )
  if (session?.user.emailVerified === true) return <Navigate to={demoTarget ?? returnTo} replace />
  const isSignUp = mode === 'sign-up'
  const otherPath = `${isSignUp ? '/sign-in' : '/sign-up'}?returnTo=${encodeURIComponent(returnTo)}`
  return (
    <PageContainer className="mx-auto max-w-xl py-16 sm:py-24">
      <p className="eyebrow mb-3">Your account</p>
      <h1 className="font-serif text-5xl">{isSignUp ? 'Create an account' : 'Sign in'}</h1>
      <p className="mt-4 text-sm leading-6 text-muted-foreground">
        {isSignUp
          ? 'Verify your email, then sign in to continue.'
          : 'Sign in to continue to your account or checkout.'}
      </p>
      {(needsVerification || session?.user.emailVerified === false) && (
        <p className="mt-4 text-sm">
          Verify your email before continuing.{' '}
          <Link className="text-primary underline" to={authEmailPath('/check-email', returnTo)}>
            Request a verification email
          </Link>
        </p>
      )}
      <form noValidate onSubmit={handleSubmit(submit)} className="mt-9 space-y-5">
        {isSignUp && (
          <FormField
            id="auth-name"
            label="Full name"
            autoComplete="name"
            required
            maxLength={120}
            {...register('name')}
            error={errors.name?.message}
          />
        )}
        <FormField
          id="auth-email"
          label="Email address"
          type="email"
          autoComplete="email"
          required
          maxLength={254}
          {...register('email')}
          error={errors.email?.message}
        />
        <FormField
          id="auth-password"
          label="Password"
          type="password"
          autoComplete={isSignUp ? 'new-password' : 'current-password'}
          required
          {...register('password')}
          error={errors.password?.message}
        />
        {serverError && (
          <Alert
            variant="destructive"
            className="border-destructive bg-destructive-muted text-destructive"
          >
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}
        <Button type="submit" disabled={isSubmitting || demoPending} className="w-full">
          {isSubmitting ? 'Please wait…' : isSignUp ? 'Create account' : 'Sign in'}
        </Button>
      </form>
      {!isSignUp && (
        <p className="mt-4 text-sm">
          <Link className="text-primary underline" to={authEmailPath('/forgot-password', returnTo)}>
            Forgot password?
          </Link>
        </p>
      )}
      {!isSignUp && demoEnabled && (
        <section
          aria-label="Demo accounts"
          className="mt-8 rounded-xl border border-border bg-card p-5 sm:p-6"
        >
          <h2 className="text-sm font-semibold">Try a demo account</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Choose a role to explore the local store.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {demoAccounts.map(({ role, icon: Icon, description }) => (
              <Button
                key={role}
                type="button"
                variant="outline"
                aria-label={`Demo ${role}`}
                className="min-h-20 justify-start gap-3 rounded-lg px-4 py-3 text-left whitespace-normal hover:border-primary/60 hover:bg-primary/5"
                disabled={isSubmitting || demoPending}
                onClick={() => void signInDemo(role)}
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon aria-hidden="true" className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{role}</span>
                  <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                    {description}
                  </span>
                </span>
              </Button>
            ))}
          </div>
          {demoPending && (
            <p role="status" className="mt-3 text-sm">
              Signing in to your demo account…
            </p>
          )}
        </section>
      )}
      <p className="mt-6 text-sm">
        {isSignUp ? 'Already have an account?' : 'New to the bookstore?'}{' '}
        <Link className="font-semibold text-primary underline" to={otherPath}>
          {isSignUp ? 'Sign in' : 'Create an account'}
        </Link>
      </p>
    </PageContainer>
  )
}
