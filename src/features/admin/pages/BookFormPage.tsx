import { errorMessage } from '../../../lib/i18n/errors'
import { localized, message as msg, t, useI18n } from '../../../lib/i18n'
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
import { Field, FieldLabel, FieldError } from '../../../app/components/ui/field'
import { Textarea } from '../../../app/components/ui/textarea'
import { Alert, AlertDescription } from '../../../app/components/ui/alert'
import { CombinedGraphQLErrors } from '@apollo/client'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../../app/components/ui/alert-dialog'
import { Badge } from '../../../app/components/ui/badge'
import { bookFormSchema, initialStockSchema, parsePriceCents, bookSaveNotice } from '../book-form'
import { useAdminAccess, useAdminQueryError } from '../admin-access'
import { refreshCatalog } from '../admin-data'
import { AdminFeedback } from '../components/AdminFeedback'
import { CoverRequestError, uploadBookCover, removeBookCover, type CoverResult } from '../cover-api'
import { booksReturnTo } from '../activity-data'

const schema = bookFormSchema.extend({ initialStock: initialStockSchema })
type Values = z.infer<typeof schema>

export function BookFormPage() {
  useI18n()

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
        <h2 className="font-serif text-3xl">{t('admin:bookNotFound')}</h2>
        <Link to="/admin/books" className="underline">
          {t('admin:backToBooks')}
        </Link>
      </>
    )
  if ((loading || error) && !currentBook)
    return <AdminFeedback loading={loading} error={localized(error)} retry={refetch} />
  return <BookEditor key={id ?? 'new'} book={currentBook ?? undefined} />
}

function BookEditor({ book }: { book?: AdminBookFieldsFragment }) {
  useI18n()

  const client = useApolloClient()
  const navigate = useNavigate()
  const location = useLocation()
  const returnTo = booksReturnTo((location.state as { returnTo?: unknown } | null)?.returnTo)
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
  const [detailsConflict, setDetailsConflict] = useState(false)
  const [confirmReload, setConfirmReload] = useState(false)
  const [coverEditorGeneration, setCoverEditorGeneration] = useState(0)
  const detailsRevision = useRef(book?.detailsRevision)
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
    reset,
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
  async function reloadDetails() {
    if (saving.current) return
    saving.current = true
    setBusy(true)
    try {
      const result = await client.query({
        query: AdminBookDocument,
        variables: { id: savedId! },
        fetchPolicy: 'no-cache',
      })
      const latest = result.data?.adminBook
      if (!latest || latest.id !== savedId) throw new Error('Book unavailable')
      // Only discard after the read succeeds. A failed read retains the entire draft.
      reset({
        title: latest.title,
        author: latest.author,
        genre: latest.genre,
        description: latest.description,
        price: (latest.priceCents / 100).toFixed(2),
        initialStock: '0',
      })
      detailsRevision.current = latest.detailsRevision
      savedDetails.current = JSON.stringify({
        title: latest.title,
        author: latest.author,
        genre: latest.genre,
        description: latest.description,
        priceCents: latest.priceCents,
      })
      setSavedCover({ cover: latest.cover ?? null, coverRevision: latest.coverRevision })
      setCoverChange(null)
      setCoverEditorGeneration((generation) => generation + 1)
      setInvalidCover(false)
      setNeedsReload(false)
      setDetailsConflict(false)
      setError('')
    } catch (failure) {
      handleError(failure)
      setError(msg('admin:bookDetailsReloadFailed'))
    } finally {
      setConfirmReload(false)
      saving.current = false
      setBusy(false)
    }
  }
  async function reloadCover(id: string) {
    const result = await client.query({
      query: AdminBookDocument,
      variables: { id },
      fetchPolicy: 'network-only',
    })
    if (!result.data?.adminBook) throw new Error(msg('admin:bookWasNotFoundReloadThePage'))
    setSavedCover({
      cover: result.data.adminBook.cover ?? null,
      coverRevision: result.data.adminBook.coverRevision,
    })
    setNeedsReload(false)
  }
  async function save(values: Values) {
    if (saving.current || invalidCover || needsReload || detailsConflict) return
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
      if (targetId && savedDetails.current !== details) {
        if (detailsRevision.current == null) throw new Error('Missing saved book revision')
        const result = await update({
          variables: { id: targetId, input, expectedRevision: detailsRevision.current },
        })
        const updated = result.data?.updateBook
        if (!updated || updated.id !== targetId) throw new Error('Unconfirmed book update')
        detailsRevision.current = updated.detailsRevision
      } else if (!targetId) {
        const result = await create({
          variables: { input: { details: input, stock: Number(values.initialStock) } },
        })
        targetId = result.data?.createBook.id
        if (!targetId)
          throw new Error(msg('admin:unableToConfirmTheSavedBookCheckTheCatalogBeforeCreating'))
        setSavedId(targetId)
        detailsRevision.current = result.data?.createBook.detailsRevision
      }
      savedDetails.current = details
    } catch (failure) {
      handleError(failure)
      const conflict =
        CombinedGraphQLErrors.is(failure) &&
        failure.errors.some((entry) => entry.extensions?.code === 'CONFLICT')
      setDetailsConflict(conflict)
      setError(
        conflict
          ? msg('admin:bookDetailsConflict')
          : errorMessage(failure, 'admin:unableToSaveBook'),
      )
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
        state: { notice: { kind: book ? 'book-updated' : 'book-created' } },
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
        msg('admin:bookDetailsSavedButTheCoverWasNotSavedValue', {
          value0:
            code === 'COVER_CONFLICT'
              ? msg('common:conflict')
              : !code
                ? msg('admin:theCoverResultCouldNotBeConfirmedReviewTheCurrentCover')
                : failure instanceof Error
                  ? errorMessage(failure, 'admin:unableToSaveBook')
                  : msg('common:requestFailed'),
        }),
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
        {t('admin:backToBooks2')}
      </Link>
      <AdminPageHeader
        title={localized(savedId ? t('admin:editBook') : t('admin:addBook'))}
        description={localized(
          savedId
            ? t('admin:updateBookDetailsUseTheCatalogToAdjustStock')
            : t('admin:addBookDetailsAndSetTheOpeningInventory'),
        )}
      />
      {book?.archived && (
        <Badge variant="secondary" className="mt-3">
          {t('admin:archived')}
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
            key={coverEditorGeneration}
            id={savedId ?? '0'}
            title={localized(title)}
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
              label={t(
                field === 'title'
                  ? 'admin:title'
                  : field === 'author'
                    ? 'admin:author'
                    : 'admin:genre',
              )}
              error={localized(errors[field]?.message)}
              {...register(field)}
            />
          ))}
          <Field className="sm:col-span-2" data-invalid={!!errors.description}>
            <FieldLabel htmlFor="description">{t('admin:description')}</FieldLabel>
            <Textarea
              id="description"
              aria-invalid={!!errors.description}
              aria-describedby={errors.description ? 'description-error' : undefined}
              {...register('description')}
              rows={6}
              className="mt-2"
            />
            {errors.description && (
              <FieldError id="description-error" className="mt-1">
                {localized(errors.description.message)}
              </FieldError>
            )}
          </Field>
          <FormField
            id="price"
            suffix="USD"
            label={t('admin:priceUsd')}
            inputMode="decimal"
            error={localized(errors.price?.message)}
            {...register('price')}
          />
          <p className="text-xs text-muted-foreground sm:col-span-2">
            {t('common:priceInputHint')}
          </p>
          {!savedId && (
            <FormField
              id="initialStock"
              label={t('admin:initialStock')}
              inputMode="numeric"
              error={localized(errors.initialStock?.message)}
              {...register('initialStock')}
            />
          )}
          {error && (
            <Alert role="alert" variant="destructive" className="sm:col-span-2">
              <AlertDescription>{localized(error)}</AlertDescription>
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
                    setError(msg('admin:bookDetailsSavedUnableToReloadTheCoverTryAgainBefore'))
                  })
                  .finally(() => setBusy(false))
              }}
            >
              {t('admin:reloadCover')}
            </Button>
          )}
          {detailsConflict && (
            <Button type="button" variant="outline" onClick={() => setConfirmReload(true)}>
              {t('admin:reloadLatestBookDetails')}
            </Button>
          )}
          <div className="flex gap-3 border-t border-border pt-5 sm:col-span-2">
            <Button type="submit" disabled={busy || invalidCover || needsReload || detailsConflict}>
              {localized(busy ? t('admin:saving') : t('admin:saveBook'))}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => navigate(returnTo)}
            >
              {t('admin:cancel')}
            </Button>
          </div>
        </fieldset>
      </form>
      <AlertDialog
        open={confirmReload}
        onOpenChange={(open) => {
          if (!busy) setConfirmReload(open)
        }}
      >
        <AlertDialogContent className="admin-workspace admin-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin:reloadLatestBookDetails')}</AlertDialogTitle>
            <AlertDialogDescription>{t('admin:discardBookDraftWarning')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>{t('admin:keepEditingBook')}</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(event) => {
                event.preventDefault()
                void reloadDetails()
              }}
            >
              {t('admin:discardBookDraftAndReload')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {location.state?.notice && (
        <p role="status" className="mt-4">
          {localized(bookSaveNotice(location.state.notice))}
        </p>
      )}
    </section>
  )
}
