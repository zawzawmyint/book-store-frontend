import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useApolloClient, useMutation, useQuery } from '@apollo/client/react'
import { useForm } from 'react-hook-form'
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

const schema = bookFormSchema.extend({ initialStock: initialStockSchema })
type Values = z.infer<typeof schema>

export function BookFormPage() {
  const { id } = useParams()
  const valid = !id || (/^[1-9]\d*$/.test(id) && Number.isSafeInteger(Number(id)))
  const { data, loading, error, refetch } = useQuery(AdminBookDocument, {
    variables: { id: id ?? '' },
    skip: !id || !valid,
    fetchPolicy: 'no-cache',
  })
  useAdminQueryError(error)
  if (!valid || (id && !loading && !error && !data?.adminBook))
    return (
      <>
        <h2 className="font-serif text-3xl">Book not found</h2>
        <Link to="/admin/books" className="underline">
          Back to books
        </Link>
      </>
    )
  if (loading || error) return <AdminFeedback loading={loading} error={error} retry={refetch} />
  return <BookEditor key={id ?? 'new'} book={data?.adminBook ?? undefined} />
}

function BookEditor({ book }: { book?: AdminBookFieldsFragment }) {
  const client = useApolloClient()
  const navigate = useNavigate()
  const location = useLocation()
  const requestedReturn = (location.state as { returnTo?: string } | null)?.returnTo
  const returnTo = requestedReturn?.startsWith('/admin/books?') ? requestedReturn : '/admin/books'
  const { handleError } = useAdminAccess()
  const [create, { loading: creating }] = useMutation(CreateBookDocument)
  const [update, { loading: updating }] = useMutation(UpdateBookDocument)
  const [error, setError] = useState('')
  const {
    register,
    handleSubmit,
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
  async function save(values: Values) {
    setError('')
    const input = {
      title: values.title,
      author: values.author,
      genre: values.genre,
      description: values.description,
      priceCents: parsePriceCents(values.price),
    }
    try {
      if (book) await update({ variables: { id: book.id, input } })
      else
        await create({
          variables: { input: { details: input, stock: Number(values.initialStock) } },
        })
    } catch (failure) {
      handleError(failure)
      setError(failure instanceof Error ? failure.message : 'Unable to save book')
      return
    }
    void refreshCatalog(client).catch(() => {})
    navigate(returnTo, { state: { notice: book ? 'Book updated.' : 'Book created.' } })
  }
  return (
    <section className="max-w-2xl">
      <h2 className="font-serif text-3xl">{book ? 'Edit book' : 'Add book'}</h2>
      {book?.archived && <Badge variant="secondary" className="mt-3">Archived</Badge>}
      <form onSubmit={handleSubmit(save)} className="mt-8 space-y-5">
        {(['title', 'author', 'genre'] as const).map((field) => (
          <FormField
            key={field}
            id={field}
            label={field[0].toUpperCase() + field.slice(1)}
            error={errors[field]?.message}
            {...register(field)}
          />
        ))}
        <div>
          <Label htmlFor="description">
            Description
          </Label>
          <Textarea
            id="description"
            aria-invalid={!!errors.description}
            aria-describedby={errors.description ? 'description-error' : undefined}
            {...register('description')}
            rows={6}
            className="mt-2"
          />
          {errors.description && (
            <p id="description-error" className="mt-1 text-sm text-red-800">
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
        {!book && (
          <FormField
            id="initialStock"
            label="Initial stock"
            inputMode="numeric"
            error={errors.initialStock?.message}
            {...register('initialStock')}
          />
        )}
        {error && <Alert role="alert" variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
        <div className="flex gap-5">
          <Button type="submit" disabled={creating || updating}>
            {creating || updating ? 'Saving…' : 'Save book'}
          </Button>
          <Link to={returnTo} className="self-center underline">
            Cancel
          </Link>
        </div>
      </form>
    </section>
  )
}
