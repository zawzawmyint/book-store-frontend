export function safeReturnTo(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return '/'
  try {
    const url = new URL(value, window.location.origin)
    if (url.origin !== window.location.origin || url.pathname === '/sign-in' || url.pathname === '/sign-up') return '/'
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return '/'
  }
}

export function signInPath(returnTo: string): string {
  return `/sign-in?returnTo=${encodeURIComponent(returnTo)}`
}
