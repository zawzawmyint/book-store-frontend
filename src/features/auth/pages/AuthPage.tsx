import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { authClient } from '../../../lib/auth-client'
import { safeReturnTo } from '../return-to'
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

export function AuthPage({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const returnTo = safeReturnTo(params.get('returnTo'))
  const { data: session, isPending: sessionPending } = authClient.useSession()
  const [serverError, setServerError] = useState('')
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
    const result =
      mode === 'sign-up'
        ? await authClient.signUp.email({
            name: fields.name?.trim() || '',
            email: fields.email.trim().toLowerCase(),
            password: fields.password,
          })
        : await authClient.signIn.email({
            email: fields.email.trim().toLowerCase(),
            password: fields.password,
          })
    if (result.error) {
      setServerError(result.error.message || 'Unable to continue. Please try again.')
      return
    }
    navigate(returnTo, { replace: true })
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
  if (session?.user) return <Navigate to={demoTarget ?? returnTo} replace />
  const isSignUp = mode === 'sign-up'
  const otherPath = `${isSignUp ? '/sign-in' : '/sign-up'}?returnTo=${encodeURIComponent(returnTo)}`
  return (
    <PageContainer className="mx-auto max-w-xl py-16 sm:py-24">
      <p className="eyebrow mb-3">Your account</p>
      <h1 className="font-serif text-5xl">{isSignUp ? 'Create an account' : 'Sign in'}</h1>
      <p className="mt-4 text-sm leading-6 text-muted-foreground">
        Sign in to continue to Stripe test payment.
      </p>
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
      {!isSignUp && demoEnabled && (
        <section aria-label="Demo accounts" className="mt-8 border-t border-border pt-6">
          <h2 className="text-sm font-semibold">Try a demo account</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Choose a role to explore the local store.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            {(['Customer', 'Staff', 'Admin'] as const).map((role) => (
              <Button
                key={role}
                type="button"
                variant="outline"
                disabled={isSubmitting || demoPending}
                onClick={() => void signInDemo(role)}
              >
                Demo {role}
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
