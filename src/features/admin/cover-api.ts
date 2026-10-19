export type CoverResult = {
  bookId: string
  cover: { url: string; width: number; height: number } | null
  coverRevision: number
}
export class CoverRequestError extends Error {
  code: string
  constructor(code: string, message: string) {
    super(message)
    this.code = code
  }
}
function apiOrigin() {
  const value = import.meta.env.VITE_API_URL
  if (!value) return ''
  const url = new URL(value)
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.origin !== value ||
    url.hostname !== window.location.hostname
  )
    throw new Error(
      'VITE_API_URL must be an HTTP(S) origin on the storefront hostname; use a same-origin proxy for separate API hosts',
    )
  return value
}
async function changeCover(id: string, revision: number, file?: File): Promise<CoverResult> {
  const response = await fetch(`${apiOrigin()}/api/books/${encodeURIComponent(id)}/cover`, {
    method: file ? 'PUT' : 'DELETE',
    credentials: 'include',
    headers: { 'If-Match': `"${revision}"`, ...(file ? { 'Content-Type': file.type } : {}) },
    body: file,
  })
  const result = await response.json()
  if (!response.ok)
    throw new CoverRequestError(
      result.error?.code ?? 'COVER_UNAVAILABLE',
      result.error?.message ?? 'Unable to save the cover. Please try again.',
    )
  return result
}
export const uploadBookCover = (id: string, revision: number, file: File) =>
  changeCover(id, revision, file)
export const removeBookCover = (id: string, revision: number) => changeCover(id, revision)
