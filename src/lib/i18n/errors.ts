import { isMessage, message, type TranslationKey } from './index'

/** Error prose is not a stable API: use structured codes and a contextual fallback. */
export function errorMessage(
  error: unknown,
  fallback: TranslationKey = 'common:requestFailed',
  contextualCodes: Partial<Record<string, TranslationKey>> = {},
): string {
  const value = error as {
    code?: string
    status?: number
    message?: string
    errors?: { extensions?: { code?: string } }[]
  } | null
  const code = value?.errors?.[0]?.extensions?.code ?? value?.code
  const keys: Record<string, TranslationKey> = {
    UNAUTHENTICATED: 'common:signInRequired',
    FORBIDDEN: 'common:accessDenied',
    BAD_USER_INPUT: 'common:invalidInput',
    CONFLICT: 'common:conflict',
    CART_CONFLICT: 'common:conflict',
    COVER_CONFLICT: 'common:conflict',
    PAYMENT_UNAVAILABLE: 'common:paymentUnavailable',
    TOO_MANY_REQUESTS: 'common:rateLimited',
    RATE_LIMITED: 'common:rateLimited',
    EMAIL_NOT_VERIFIED: 'storefront:verifyYourEmailBeforeSigningIn',
  }
  if (value?.status === 429) return message('common:rateLimited')
  if (code && contextualCodes[code]) return message(contextualCodes[code])
  if (code && keys[code]) return message(keys[code])
  // Errors deliberately raised by this client may already carry a deferred descriptor.
  if (isMessage(value?.message)) return value.message
  return message(fallback)
}
