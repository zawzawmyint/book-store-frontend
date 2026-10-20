import { localized, message as msg, t, useI18n } from '../../../lib/i18n'
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
import { BookLoader } from '../../../app/components/BookLoader'
import { Alert, AlertDescription } from '../../../app/components/ui/alert'

const schema = z.object({
  name: z
    .string()
    .trim()
    .min(1, msg('storefront:enterYourName'))
    .max(120, msg('storefront:use120CharactersOrFewer'))
    .optional(),
  email: z
    .email(msg('storefront:enterAValidEmailAddress'))
    .max(254, msg('storefront:use254CharactersOrFewer')),
  password: z
    .string()
    .min(8, msg('storefront:useAtLeast8Characters'))
    .max(128, msg('storefront:use128CharactersOrFewer')),
})
type Fields = z.infer<typeof schema>

const demoAccounts = [
  {
    role: 'Customer',
    icon: BookOpen,
    get description() {
      return t('storefront:browseBooks')
    },
  },
  {
    role: 'Staff',
    icon: Store,
    get description() {
      return t('storefront:manageTheStore')
    },
  },
  {
    role: 'Admin',
    icon: ShieldCheck,
    get description() {
      return t('storefront:exploreAllTools')
    },
  },
] as const

export function AuthPage({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  useI18n()

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
      setError('name', { message: msg('storefront:enterYourName') })
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
            ? msg('storefront:tooManyAttemptsWaitBeforeTryingAgain')
            : unverified
              ? msg('storefront:verifyYourEmailBeforeSigningIn')
              : msg('storefront:unableToContinueCheckYourDetailsAndTryAgain'),
        )
        return
      }
      navigate(mode === 'sign-up' ? authEmailPath('/check-email', returnTo) : returnTo, {
        replace: true,
      })
    } catch {
      setServerError(msg('storefront:unableToConnectCheckYourConnectionAndTryAgain'))
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
      if (result.error) throw new Error(msg('storefront:demoSignInFailed'))
      navigate(target, { replace: true })
    } catch {
      setDemoTarget(null)
      setServerError(msg('storefront:unableToSignInToTheDemoAccountCheckTheApi'))
    } finally {
      setDemoPending(false)
    }
  }

  if (sessionPending)
    return <BookLoader label={t('storefront:loadingYourAccount')} className="py-24" />
  if (session?.user.emailVerified === true) return <Navigate to={demoTarget ?? returnTo} replace />
  const isSignUp = mode === 'sign-up'
  const otherPath = `${isSignUp ? '/sign-in' : '/sign-up'}?returnTo=${encodeURIComponent(returnTo)}`
  return (
    <PageContainer className="mx-auto max-w-xl py-16 sm:py-24">
      <p className="eyebrow mb-3">{t('storefront:yourAccount')}</p>
      <h1 className="font-serif text-5xl">
        {localized(isSignUp ? t('storefront:createAnAccount') : t('storefront:signIn'))}
      </h1>
      <p className="mt-4 text-sm leading-6 text-muted-foreground">
        {localized(
          isSignUp
            ? t('storefront:verifyYourEmailThenSignInToContinue')
            : t('storefront:signInToContinueToYourAccountOrCheckout'),
        )}
      </p>
      {(needsVerification || session?.user.emailVerified === false) && (
        <p className="mt-4 text-sm">
          {t('storefront:verifyYourEmailBeforeContinuing')}
          <Link className="text-primary underline" to={authEmailPath('/check-email', returnTo)}>
            {t('storefront:requestAVerificationEmail')}
          </Link>
        </p>
      )}
      <form noValidate onSubmit={handleSubmit(submit)} className="mt-9 space-y-5">
        {isSignUp && (
          <FormField
            id="auth-name"
            label={t('storefront:fullName')}
            autoComplete="name"
            required
            maxLength={120}
            {...register('name')}
            error={localized(errors.name?.message)}
          />
        )}
        <FormField
          id="auth-email"
          label={t('storefront:emailAddress')}
          type="email"
          autoComplete="email"
          required
          maxLength={254}
          {...register('email')}
          error={localized(errors.email?.message)}
        />
        <FormField
          id="auth-password"
          label={t('storefront:password')}
          type="password"
          autoComplete={isSignUp ? 'new-password' : 'current-password'}
          required
          {...register('password')}
          error={localized(errors.password?.message)}
        />
        {serverError && (
          <Alert
            variant="destructive"
            className="border-destructive bg-destructive-muted text-destructive"
          >
            <AlertDescription>{localized(serverError)}</AlertDescription>
          </Alert>
        )}
        <Button type="submit" disabled={isSubmitting || demoPending} className="w-full">
          {localized(
            isSubmitting
              ? t('storefront:pleaseWait')
              : isSignUp
                ? t('storefront:createAccount')
                : t('storefront:signIn'),
          )}
        </Button>
      </form>
      {!isSignUp && (
        <p className="mt-4 text-sm">
          <Link className="text-primary underline" to={authEmailPath('/forgot-password', returnTo)}>
            {t('storefront:forgotPassword')}
          </Link>
        </p>
      )}
      {!isSignUp && demoEnabled && (
        <section
          aria-label={t('storefront:demoAccounts')}
          className="mt-8 rounded-xl border border-border bg-card p-5 sm:p-6"
        >
          <h2 className="text-sm font-semibold">{t('storefront:tryADemoAccount')}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {t('storefront:chooseARoleToExploreTheLocalStore')}
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {demoAccounts.map(({ role, icon: Icon, description }) => (
              <Button
                key={role}
                type="button"
                variant="outline"
                aria-label={t('storefront:demoValue', {
                  value0: t(
                    role === 'Admin'
                      ? 'common:adminRole'
                      : role === 'Staff'
                        ? 'common:staffRole'
                        : 'common:customerRole',
                  ),
                })}
                className="min-h-20 justify-start gap-3 rounded-lg px-4 py-3 text-start whitespace-normal hover:border-primary/60 hover:bg-primary/5"
                disabled={isSubmitting || demoPending}
                onClick={() => void signInDemo(role)}
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon aria-hidden="true" className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">
                    {t(
                      role === 'Admin'
                        ? 'common:adminRole'
                        : role === 'Staff'
                          ? 'common:staffRole'
                          : 'common:customerRole',
                    )}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                    {localized(description)}
                  </span>
                </span>
              </Button>
            ))}
          </div>
          {demoPending && (
            <p role="status" className="mt-3 text-sm">
              {t('storefront:signingInToYourDemoAccount')}
            </p>
          )}
        </section>
      )}
      <p className="mt-6 text-sm">
        {localized(
          isSignUp ? t('storefront:alreadyHaveAnAccount') : t('storefront:newToTheBookstore'),
        )}{' '}
        <Link className="font-semibold text-primary underline" to={otherPath}>
          {localized(isSignUp ? t('storefront:signIn') : t('storefront:createAnAccount'))}
        </Link>
      </p>
    </PageContainer>
  )
}
