import { useEffect, useRef, useState } from 'react'
import { useApolloClient } from '@apollo/client/react'
import { AdminBookDocument, type AdminBookFieldsFragment } from '../../../generated/graphql'
import { Button } from '../../../app/components/ui/button'
import { Label } from '../../../app/components/ui/label'
import { AdminDialog } from './AdminDialog'
import { BookCover } from '../../books/components/BookCover'
import { useAdminAccess } from '../admin-access'
import { refreshCatalog } from '../admin-data'
import { CoverRequestError, uploadBookCover, removeBookCover, type CoverResult } from '../cover-api'

export function BookCoverEditor({ book }: { book: AdminBookFieldsFragment }) {
  const client = useApolloClient(),
    { handleError } = useAdminAccess()
  const [saved, setSaved] = useState<Pick<CoverResult, 'cover' | 'coverRevision'>>({
    cover: book.cover ?? null,
    coverRevision: book.coverRevision,
  })
  const [selection, setSelection] = useState<{ file: File; url: string } | null>(null)
  const [busy, setBusy] = useState(false),
    [failure, setFailure] = useState(''),
    [notice, setNotice] = useState('')
  const [confirming, setConfirming] = useState(false),
    [needsReload, setNeedsReload] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const [removeOpener, setRemoveOpener] = useState<HTMLButtonElement | null>(null)
  useEffect(
    () => () => {
      if (selection) URL.revokeObjectURL(selection.url)
    },
    [selection],
  )
  function clearSelection() {
    setSelection(null)
    if (input.current) input.current.value = ''
  }
  async function reload() {
    const result = await client.query({
      query: AdminBookDocument,
      variables: { id: book.id },
      fetchPolicy: 'network-only',
    })
    if (!result.data?.adminBook) throw new Error('Book was not found. Reload the page.')
    setSaved({
      cover: result.data.adminBook.cover ?? null,
      coverRevision: result.data.adminBook.coverRevision,
    })
    setNeedsReload(false)
  }
  async function save(removing = false) {
    setBusy(true)
    setFailure('')
    setNotice('')
    try {
      const result = removing
        ? await removeBookCover(book.id, saved.coverRevision)
        : await uploadBookCover(book.id, saved.coverRevision, selection!.file)
      setSaved(result)
      clearSelection()
      setConfirming(false)
      setNotice(removing ? 'Cover removed.' : 'Cover saved.')
      void refreshCatalog(client).catch(() => {})
    } catch (error) {
      setConfirming(false)
      const code = error instanceof CoverRequestError ? error.code : undefined
      if (code === 'FORBIDDEN' || code === 'UNAUTHENTICATED') {
        clearSelection()
        handleError({ errors: [{ extensions: { code } }] })
      }
      if (code === 'COVER_CONFLICT' || !code) {
        setNeedsReload(true)
        try {
          await reload()
        } catch {
          /* Explicit reload remains available. */
        }
        setFailure(
          code === 'COVER_CONFLICT'
            ? 'The cover changed elsewhere. The latest cover has been requested; review it before retrying.'
            : 'The save result could not be confirmed. The current cover has been requested; review it before retrying.',
        )
      } else setFailure(error instanceof Error ? error.message : 'Unable to save the cover.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <section aria-labelledby="book-cover-heading" className="mt-10 border-t border-border pt-7">
      <h3 id="book-cover-heading" className="font-serif text-2xl">
        Book cover
      </h3>
      <p className="mt-2 text-sm text-muted-foreground">
        Cover changes save separately from book details.
      </p>
      <div className="mt-5 grid gap-6 sm:grid-cols-[150px_1fr]">
        <div>
          <BookCover id={book.id} title={book.title} author={book.author} cover={saved.cover} />
          {selection && (
            <div className="mt-4">
              <p className="mb-2 text-xs text-muted-foreground">Selected image preview</p>
              <img
                src={selection.url}
                alt={`Selected cover for ${book.title}`}
                className="aspect-[0.72] w-full object-contain"
              />
            </div>
          )}
        </div>
        <div className="min-w-0 space-y-4">
          <div>
            <Label htmlFor="book-cover-file">Choose cover image</Label>
            <input
              ref={input}
              id="book-cover-file"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={busy}
              aria-describedby="book-cover-help"
              className="mt-2 block w-full text-sm file:mr-3 file:rounded-sm file:border file:border-border file:bg-surface file:px-3 file:py-2"
              onChange={(event) => {
                setFailure('')
                setNotice('')
                const file = event.target.files?.[0]
                if (!file) {
                  clearSelection()
                  return
                }
                if (
                  !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
                  file.size > 5 * 1024 * 1024 ||
                  file.size === 0
                ) {
                  clearSelection()
                  setFailure('Choose a JPEG, PNG or WebP image no larger than 5 MiB.')
                  return
                }
                setSelection({ file, url: URL.createObjectURL(file) })
              }}
            />
            <p id="book-cover-help" className="mt-2 text-xs text-muted-foreground">
              JPEG, PNG or WebP, up to 5 MiB. The full artwork is preserved.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              disabled={!selection || busy || needsReload}
              onClick={() => void save()}
            >
              {busy ? 'Saving cover…' : saved.cover ? 'Replace cover' : 'Upload cover'}
            </Button>
            {selection && (
              <Button type="button" variant="outline" disabled={busy} onClick={clearSelection}>
                Cancel selection
              </Button>
            )}
            {saved.cover && (
              <Button
                type="button"
                variant="outline"
                disabled={busy || needsReload}
                onClick={(event) => {
                  setRemoveOpener(event.currentTarget)
                  setConfirming(true)
                }}
              >
                Remove cover
              </Button>
            )}
          </div>
          {failure && (
            <p role="alert" className="text-sm text-destructive">
              {failure}
            </p>
          )}
          {needsReload && (
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => {
                setBusy(true)
                void reload()
                  .catch(() => setFailure('Unable to reload the cover. Try again.'))
                  .finally(() => setBusy(false))
              }}
            >
              Reload cover
            </Button>
          )}
          <p role="status" className="text-sm">
            {notice}
          </p>
        </div>
      </div>
      {confirming && (
        <AdminDialog
          title="Remove this cover?"
          busy={busy}
          close={() => setConfirming(false)}
          returnFocusTo={removeOpener}
          returnFocusFallback={() => input.current}
        >
          <p className="mb-4">The generated cover design will appear instead.</p>
          <div className="flex gap-3">
            <Button type="button" disabled={busy} onClick={() => void save(true)}>
              Confirm remove
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => setConfirming(false)}
            >
              Keep cover
            </Button>
          </div>
        </AdminDialog>
      )}
    </section>
  )
}
