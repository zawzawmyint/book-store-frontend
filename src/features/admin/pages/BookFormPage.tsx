import { BookCoverEditor, type CoverChange } from '../components/BookCoverEditor'
import { AdminPageHeader } from '../components/AdminPageHeader'
import { useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useApolloClient, useMutation, useQuery } from '@apollo/client/react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  AdminBookDocument,
  CreateBookDocument,
  UpdateBookDocument,
  type AdminBookFieldsFragment,
} from '../../../generated/graphql'
import { FormField } from '../../../app/components/FormField'
import { Button } from '../../../app/components/ui/button'
import { Label } from '../../../app/components/ui/label'
import { Textarea } from '../../../app/components/ui/textarea'
import { Alert, AlertDescription } from '../../../app/components/ui/alert'
import { Badge } from '../../../app/components/ui/badge'
import { bookFormSchema, initialStockSchema, parsePriceCents } from '../book-form'
import { useAdminAccess, useAdminQueryError } from '../admin-access'
import { refreshCatalog } from '../admin-data'
import { AdminFeedback } from '../components/AdminFeedback'
import { CoverRequestError, uploadBookCover, removeBookCover, type CoverResult } from '../cover-api'

const schema = bookFormSchema.extend({ initialStock: initialStockSchema })
type Values = z.infer<typeof schema>

export function BookFormPage() {
  const { id } = useParams()
  const valid = !id || (/^[1-9]\d*$/.test(id) && Number.isSafeInteger(Number(id)))
  const { data, previousData, loading, error, refetch } = useQuery(AdminBookDocument, {
    variables: { id: id ?? '' },
    skip: !id || !valid,
    fetchPolicy: 'no-cache',
    notifyOnNetworkStatusChange: false,
  })
  const queriedBook = data ? data.adminBook : previousData?.adminBook
  const currentBook = queriedBook?.id === id ? queriedBook : undefined
  useAdminQueryError(error)
  if (!valid || (id && !loading && !error && !currentBook))
    return (
      <>
        <h2 className="font-serif text-3xl">Book not found</h2>
        <Link to="/admin/books" className="underline">
          Back to books
        </Link>
      </>
    )
  if ((loading || error) && !currentBook)
    return <AdminFeedback loading={loading} error={error} retry={refetch} />
  return <BookEditor key={id ?? 'new'} book={currentBook ?? undefined} />
}

function BookEditor({ book }: { book?: AdminBookFieldsFragment }) {
  const client = useApolloClient()
  const navigate = useNavigate()
  const location = useLocation()
  const requestedReturn = (location.state as { returnTo?: string } | null)?.returnTo
  const returnTo = requestedReturn?.startsWith('/admin/books?') ? requestedReturn : '/admin/books'
  const { handleError } = useAdminAccess()
  const [create] = useMutation(CreateBookDocument)
  const [update] = useMutation(UpdateBookDocument)
  const [error, setError] = useState('')
  const [savedId, setSavedId] = useState(book?.id)
  const [savedCover, setSavedCover] = useState<Pick<CoverResult, 'cover' | 'coverRevision'>>({
    cover: book?.cover ?? null,
    coverRevision: book?.coverRevision ?? 0,
  })
  const [coverChange, setCoverChange] = useState<CoverChange>(null)
  const [invalidCover, setInvalidCover] = useState(false)
  const [needsReload, setNeedsReload] = useState(false)
  const [busy, setBusy] = useState(false)
  const saving = useRef(false)
  const savedDetails = useRef(
    book
      ? JSON.stringify({
          title: book.title,
          author: book.author,
          genre: book.genre,
          description: book.description,
          priceCents: book.priceCents,
        })
      : undefined,
  )
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: book?.title ?? '',
      author: book?.author ?? '',
      genre: book?.genre ?? '',
      description: book?.description ?? '',
      price: book ? (book.priceCents / 100).toFixed(2) : '',
      initialStock: '0',
    },
  })
  const [title, author] = useWatch({ control, name: ['title', 'author'] })
  async function reloadCover(id: string) {
    const result = await client.query({
      query: AdminBookDocument,
      variables: { id },
      fetchPolicy: 'network-only',
    })
    if (!result.data?.adminBook) throw new Error('Book was not found. Reload the page.')
    setSavedCover({
      cover: result.data.adminBook.cover ?? null,
      coverRevision: result.data.adminBook.coverRevision,
    })
    setNeedsReload(false)
  }
  async function save(values: Values) {
    if (saving.current || invalidCover || needsReload) return
    saving.current = true
    setBusy(true)
    setError('')
    const input = {
      title: values.title,
      author: values.author,
      genre: values.genre,
      description: values.description,
      priceCents: parsePriceCents(values.price),
    }
    let targetId = savedId
    const details = JSON.stringify(input)
    try {
      if (targetId && savedDetails.current !== details)
        await update({ variables: { id: targetId, input } })
      else if (!targetId) {
        const result = await create({
          variables: { input: { details: input, stock: Number(values.initialStock) } },
        })
        targetId = result.data?.createBook.id
        if (!targetId)
          throw new Error(
            'Unable to confirm the saved book. Check the catalog before creating again.',
          )
        setSavedId(targetId)
      }
      savedDetails.current = details
    } catch (failure) {
      handleError(failure)
      setError(failure instanceof Error ? failure.message : 'Unable to save book')
      saving.current = false
      setBusy(false)
      return
    }
    try {
      if (coverChange) {
        const result =
          coverChange.kind === 'upload'
            ? await uploadBookCover(targetId!, savedCover.coverRevision, coverChange.file)
            : await removeBookCover(targetId!, savedCover.coverRevision)
        setSavedCover(result)
        setCoverChange(null)
      }
      navigate(returnTo, {
        replace: !book,
        state: { notice: book ? 'Book updated.' : 'Book created.' },
      })
    } catch (failure) {
      const code = failure instanceof CoverRequestError ? failure.code : undefined
      if (code === 'FORBIDDEN' || code === 'UNAUTHENTICATED') {
        setCoverChange(null)
        handleError({ errors: [{ extensions: { code } }] })
      }
      if (code === 'COVER_CONFLICT' || !code) {
        setNeedsReload(true)
        try {
          await reloadCover(targetId!)
        } catch (reloadFailure) {
          handleError(reloadFailure)
        }
      }
      setError(
        `Book details saved, but the cover was not saved. ${
          code === 'COVER_CONFLICT'
            ? 'The cover changed elsewhere. Review the latest cover before saving again.'
            : !code
              ? 'The cover result could not be confirmed. Review the current cover before saving again.'
              : failure instanceof Error
                ? failure.message
                : 'Please try again.'
        }`,
      )
    } finally {
      void refreshCatalog(client).catch(() => {})
      saving.current = false
      setBusy(false)
    }
  }
  return (
    <section className="max-w-3xl">
      <Link
        to={returnTo}
        className="admin-back-link"
        aria-disabled={busy}
        onClick={(event) => {
          if (busy) event.preventDefault()
        }}
      >
        ← Back to books
      </Link>
      <AdminPageHeader
        title={savedId ? 'Edit book' : 'Add book'}
        description={
          savedId
            ? 'Update book details. Use the catalog to adjust stock.'
            : 'Add book details and set the opening inventory.'
        }
      />
      {book?.archived && (
        <Badge variant="secondary" className="mt-3">
          Archived
        </Badge>
      )}
      <form
        onSubmit={(event) => {
          void handleSubmit(save)(event)
        }}
        className="admin-form-panel"
        aria-busy={busy}
      >
        <fieldset disabled={busy} className="grid min-w-0 gap-5 sm:grid-cols-2">
          <BookCoverEditor
            id={savedId ?? '0'}
            title={title}
            author={author}
            cover={savedCover.cover}
            change={coverChange}
            onChange={setCoverChange}
            onValidationChange={setInvalidCover}
            disabled={busy}
          />
          {(['title', 'author', 'genre'] as const).map((field) => (
            <FormField
              key={field}
              id={field}
              label={field[0].toUpperCase() + field.slice(1)}
              error={errors[field]?.message}
              {...register(field)}
            />
          ))}
          <div className="sm:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              aria-invalid={!!errors.description}
              aria-describedby={errors.description ? 'description-error' : undefined}
              {...register('description')}
              rows={6}
              className="mt-2"
            />
            {errors.description && (
              <p id="description-error" className="mt-1 text-sm text-destructive">
                {errors.description.message}
              </p>
            )}
          </div>
          <FormField
            id="price"
            label="Price (USD)"
            inputMode="decimal"
            error={errors.price?.message}
            {...register('price')}
          />
          {!savedId && (
            <FormField
              id="initialStock"
              label="Initial stock"
              inputMode="numeric"
              error={errors.initialStock?.message}
              {...register('initialStock')}
            />
          )}
          {error && (
            <Alert role="alert" variant="destructive" className="sm:col-span-2">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {needsReload && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setBusy(true)
                void reloadCover(savedId!)
                  .catch((failure) => {
                    handleError(failure)
                    setError(
                      'Book details saved. Unable to reload the cover. Try again before saving.',
                    )
                  })
                  .finally(() => setBusy(false))
              }}
            >
              Reload cover
            </Button>
          )}
          <div className="flex gap-3 border-t border-border pt-5 sm:col-span-2">
            <Button type="submit" disabled={busy || invalidCover || needsReload}>
              {busy ? 'Saving…' : 'Save book'}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => navigate(returnTo)}
            >
              Cancel
            </Button>
          </div>
        </fieldset>
      </form>
      {location.state?.notice && (
        <p role="status" className="mt-4">
          {location.state.notice}
        </p>
      )}
    </section>
  )
}
