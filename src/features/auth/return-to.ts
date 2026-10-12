export function safeReturnTo(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return '/'
  try {
    const url = new URL(value, window.location.origin)
    if (
      url.origin !== window.location.origin ||
      [
        '/sign-in',
        '/sign-up',
        '/check-email',
        '/verification-result',
        '/forgot-password',
        '/reset-password',
      ].includes(url.pathname.replace(/\/$/, ''))
    )
      return '/'
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return '/'
  }
}

export function authEmailPath(
  path: '/check-email' | '/verification-result' | '/forgot-password' | '/reset-password',
  returnTo: string,
): string {
  return `${path}?returnTo=${encodeURIComponent(safeReturnTo(returnTo))}`
}

export function authEmailCallback(
  path: '/verification-result' | '/reset-password',
  returnTo: string,
): string {
  return new URL(authEmailPath(path, returnTo), window.location.origin).href
}

export function signInPath(returnTo: string): string {
  return `/sign-in?returnTo=${encodeURIComponent(returnTo)}`
}
