import { useEffect, useRef, useState } from 'react'
import { Button } from '../../../app/components/ui/button'
import { Label } from '../../../app/components/ui/label'
import { BookCover, type CoverImage } from '../../books/components/BookCover'

export type CoverChange = { kind: 'upload'; file: File; url: string } | { kind: 'remove' } | null

export function BookCoverEditor({
  id,
  title,
  author,
  cover,
  change,
  onChange,
  onValidationChange,
  disabled,
}: {
  id: string
  title: string
  author: string
  cover: CoverImage | null
  change: CoverChange
  onChange: (change: CoverChange) => void
  onValidationChange: (invalid: boolean) => void
  disabled: boolean
}) {
  const input = useRef<HTMLInputElement>(null)
  const [failure, setFailure] = useState('')
  const preview = change?.kind === 'upload' ? change.url : undefined
  const file = change?.kind === 'upload' ? change.file : undefined
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview)
    }
  }, [preview])
  function reset() {
    onChange(null)
    onValidationChange(false)
    setFailure('')
    if (input.current) input.current.value = ''
  }
  return (
    <section
      aria-labelledby="book-cover-heading"
      className="border-b border-border pb-5 sm:col-span-2"
    >
      <h3 id="book-cover-heading" className="font-serif text-xl">
        Cover image <span className="font-sans text-sm text-muted-foreground">(optional)</span>
      </h3>
      <div className="mt-4 grid gap-5 sm:grid-cols-[140px_1fr]">
        <div className="w-32 sm:w-full">
          {preview ? (
            <img
              src={preview}
              alt={`Selected cover for ${title || 'new book'}`}
              className="aspect-[0.72] w-full object-contain"
            />
          ) : (
            <BookCover
              id={id}
              title={title || 'Book title'}
              author={author || 'Author'}
              cover={change?.kind === 'remove' ? null : cover}
            />
          )}
          {(preview || change?.kind === 'remove') && cover && (
            <div className="mt-3">
              <p className="mb-2 text-xs text-muted-foreground">Current saved cover</p>
              <BookCover
                id={id}
                title={title || 'Book title'}
                author={author || 'Author'}
                cover={cover}
              />
            </div>
          )}
        </div>
        <div className="min-w-0 space-y-3">
          <div>
            <Label htmlFor="book-cover-file">Choose cover image</Label>
            <input
              ref={input}
              id="book-cover-file"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={disabled}
              aria-invalid={!!failure}
              aria-describedby={`book-cover-help${failure ? ' book-cover-error' : ''}`}
              className="mt-2 block w-full text-sm file:mr-3 file:rounded-sm file:border file:border-border file:bg-surface file:px-3 file:py-2"
              onChange={(event) => {
                const selected = event.target.files?.[0]
                if (!selected) {
                  reset()
                  return
                }
                if (
                  !['image/jpeg', 'image/png', 'image/webp'].includes(selected.type) ||
                  selected.size === 0 ||
                  selected.size > 5 * 1024 * 1024
                ) {
                  onChange(null)
                  onValidationChange(true)
                  setFailure('Choose a JPEG, PNG or WebP image no larger than 5 MiB.')
                  return
                }
                setFailure('')
                onValidationChange(false)
                onChange({ kind: 'upload', file: selected, url: URL.createObjectURL(selected) })
              }}
            />
            <p id="book-cover-help" className="mt-2 text-xs text-muted-foreground">
              JPEG, PNG or WebP, up to 5 MiB. The full artwork is preserved.
            </p>
          </div>
          <p role="status" className="text-sm text-muted-foreground">
            {change?.kind === 'remove'
              ? 'Cover will be removed when you save. The generated design will appear instead.'
              : file
                ? 'Selected cover will be uploaded when you save.'
                : 'Book details and cover changes save together.'}
          </p>
          <div className="flex flex-wrap gap-3">
            {(file || failure) && (
              <Button type="button" variant="outline" disabled={disabled} onClick={reset}>
                Cancel selection
              </Button>
            )}
            {change?.kind === 'remove' ? (
              <Button type="button" variant="outline" disabled={disabled} onClick={reset}>
                Undo removal
              </Button>
            ) : (
              cover &&
              !file && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={disabled}
                  onClick={() => onChange({ kind: 'remove' })}
                >
                  Remove cover
                </Button>
              )
            )}
          </div>
          {failure && (
            <p id="book-cover-error" role="alert" className="text-sm text-destructive">
              {failure}
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
