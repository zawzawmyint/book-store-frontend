import { localized, message as msg, t, useI18n } from '../../../lib/i18n'
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
    .pipe(
      z
        .email(msg('storefront:enterAValidEmailAddress'))
        .max(254, msg('storefront:use254CharactersOrFewer')),
    ),
})
const passwordSchema = z
  .object({
    password: z
      .string()
      .min(8, msg('storefront:useAtLeast8Characters'))
      .max(128, msg('storefront:use128CharactersOrFewer')),
    confirmation: z.string(),
  })
  .refine((fields) => fields.password === fields.confirmation, {
    message: msg('storefront:passwordsMustMatch'),
    path: ['confirmation'],
  })
const acceptedMessage = msg('storefront:ifThisAddressIsEligibleAnEmailHasBeenRequestedCheck')

function EmailShell({ title, children }: { title: string; children: React.ReactNode }) {
  useI18n()

  return (
    <PageContainer className="mx-auto max-w-xl py-16 sm:py-24">
      <p className="eyebrow mb-3">{t('storefront:yourAccount')}</p>
      <h1 className="font-serif text-4xl sm:text-5xl">
        <bdi dir="auto">{localized(title)}</bdi>
      </h1>
      <div className="mt-6 space-y-5 text-sm leading-6">{localized(children)}</div>
    </PageContainer>
  )
}
function Feedback({ error, message }: { error: string; message: string }) {
  useI18n()

  return (
    <>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{localized(error)}</AlertDescription>
        </Alert>
      )}
      {message && <p role="status">{localized(message)}</p>}
    </>
  )
}

function EmailRequestPage({ recovery }: { recovery: boolean }) {
  useI18n()

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
          setError(msg('storefront:tooManyRequestsWaitBeforeTryingAgain'))
        } else setError(msg('storefront:unableToRequestAnEmailPleaseTryAgain'))
        return
      }
      setMessage(acceptedMessage)
      if (!recovery) setCooldown(60)
    } catch {
      setError(msg('storefront:unableToConnectCheckYourConnectionAndTryAgain'))
    }
  }
  return (
    <EmailShell
      title={localized(recovery ? t('storefront:forgotPassword') : t('storefront:checkYourEmail'))}
    >
      <p>
        {localized(
          recovery
            ? t('storefront:requestALinkToChooseANewPassword')
            : t('storefront:useTheVerificationLinkBeforeSigningInLinksExpireAfterOne'),
        )}
      </p>
      <form noValidate onSubmit={handleSubmit(submit)} className="space-y-5">
        <FormField
          id="email-request"
          label={t('storefront:emailAddress')}
          type="email"
          autoComplete="email"
          required
          maxLength={254}
          {...register('email')}
          error={localized(errors.email?.message)}
        />
        <Feedback error={localized(error)} message={message} />
        <Button type="submit" disabled={isSubmitting || cooldown > 0} className="w-full">
          {localized(
            isSubmitting
              ? t('storefront:pleaseWait')
              : cooldown > 0
                ? t('storefront:resendInValueS', { value0: cooldown })
                : recovery
                  ? t('storefront:requestResetLink')
                  : t('storefront:resendVerificationEmail'),
          )}
        </Button>
      </form>
      <Link className="text-primary underline" to={signInPath(returnTo)}>
        {t('storefront:signIn')}
      </Link>
    </EmailShell>
  )
}
export function CheckEmailPage() {
  useI18n()

  return <EmailRequestPage recovery={false} />
}
export function ForgotPasswordPage() {
  useI18n()

  return <EmailRequestPage recovery />
}

export function VerificationResultPage() {
  useI18n()

  const [params] = useSearchParams()
  const returnTo = safeReturnTo(params.get('returnTo'))
  const failed = params.has('error')
  return (
    <EmailShell
      title={localized(
        failed ? t('storefront:verificationLinkUnavailable') : t('storefront:emailVerification'),
      )}
    >
      <p>
        {localized(
          failed
            ? t('storefront:thisLinkIsInvalidOrExpiredRequestANewVerificationEmail')
            : t('storefront:signInToCheckYourAccountAndContinueIfYourEmail'),
        )}
      </p>
      <Link
        className="text-primary underline"
        to={failed ? authEmailPath('/check-email', returnTo) : signInPath(returnTo)}
      >
        {localized(failed ? t('storefront:requestAVerificationEmail') : t('storefront:signIn'))}
      </Link>
    </EmailShell>
  )
}

export function ResetPasswordPage() {
  useI18n()

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
        if (result.error.status === 429)
          setError(msg('storefront:tooManyRequestsWaitBeforeTryingAgain'))
        else if (result.error.status >= 500)
          setError(msg('storefront:unableToResetYourPasswordPleaseTryAgain'))
        else setInvalid(true)
        return
      }
      setDone(true)
      navigate(authEmailPath('/reset-password', returnTo), { replace: true })
    } catch {
      setError(msg('storefront:unableToConnectCheckYourConnectionAndTryAgain'))
    }
  }
  return (
    <EmailShell
      title={localized(
        done
          ? t('storefront:passwordReset')
          : invalid
            ? t('storefront:resetLinkUnavailable')
            : t('storefront:chooseANewPassword'),
      )}
    >
      {done ? (
        <>
          <p>{t('storefront:yourPasswordHasBeenUpdatedSignInWithYourNewPassword')}</p>
          <Link className="text-primary underline" to={signInPath(returnTo)}>
            {t('storefront:signIn')}
          </Link>
        </>
      ) : invalid ? (
        <>
          <p>{t('storefront:thisResetLinkIsInvalidExpiredOrAlreadyUsed')}</p>
          <Link className="text-primary underline" to={authEmailPath('/forgot-password', returnTo)}>
            {t('storefront:requestANewResetLink')}
          </Link>
        </>
      ) : (
        <form noValidate onSubmit={handleSubmit(submit)} className="space-y-5">
          <FormField
            id="reset-password"
            label={t('storefront:newPassword')}
            type="password"
            autoComplete="new-password"
            required
            maxLength={128}
            {...register('password')}
            error={localized(errors.password?.message)}
          />
          <FormField
            id="reset-confirmation"
            label={t('storefront:confirmNewPassword')}
            type="password"
            autoComplete="new-password"
            required
            maxLength={128}
            {...register('confirmation')}
            error={localized(errors.confirmation?.message)}
          />
          <Feedback error={localized(error)} message="" />
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {localized(isSubmitting ? t('storefront:pleaseWait') : t('storefront:resetPassword'))}
          </Button>
        </form>
      )}
    </EmailShell>
  )
}
