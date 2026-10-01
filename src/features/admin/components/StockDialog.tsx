import { useState } from 'react'
import { useApolloClient, useMutation } from '@apollo/client/react'
import { CombinedGraphQLErrors } from '@apollo/client'
import {
  AdjustBookStockDocument,
  AdminBookDocument,
  type AdminBookFieldsFragment,
} from '../../../generated/graphql'
import { FormField } from '../../../app/components/FormField'
import { Button } from '../../../app/components/ui/button'
import { Alert, AlertDescription } from '../../../app/components/ui/alert'
import { useAdminAccess } from '../admin-access'
import { refreshCatalog } from '../admin-data'
import { stockDeltaSchema } from '../book-form'
import { AdminDialog } from './AdminDialog'

export function StockDialog({
  book,
  close,
  saved,
}: {
  book: AdminBookFieldsFragment
  close: () => void
  saved: (message: string) => void
}) {
  const client = useApolloClient()
  const { handleError } = useAdminAccess()
  const [adjust, { loading }] = useMutation(AdjustBookStockDocument)
  const [delta, setDelta] = useState('')
  const [stock, setStock] = useState(book.stock)
  const [error, setError] = useState('')
  const [unknown, setUnknown] = useState(false)
  const [checked, setChecked] = useState(false)
  const [checking, setChecking] = useState(false)
  async function checkStock() {
    setChecking(true)
    try {
      const result = await client.query({
        query: AdminBookDocument,
        variables: { id: book.id },
        fetchPolicy: 'no-cache',
      })
      if (!result.data?.adminBook) throw new Error('Book was not found')
      setStock(result.data.adminBook.stock)
      setChecked(true)
    } catch (failure) {
      handleError(failure)
      setError(failure instanceof Error ? failure.message : 'Unable to refresh stock')
    } finally {
      setChecking(false)
    }
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    const result = stockDeltaSchema.safeParse(delta)
    if (!result.success) {
      setError(result.error.issues[0].message)
      return
    }
    setError('')
    try {
      const response = await adjust({ variables: { id: book.id, delta: Number(result.data) } })
      // The write succeeded. Refresh errors must never turn it into a retryable write.
      saved(`Stock updated to ${response.data!.adjustBookStock.stock}.`)
      void refreshCatalog(client).catch(() => {})
    } catch (failure) {
      handleError(failure)
      if (CombinedGraphQLErrors.is(failure)) {
        setError(failure.message)
        await checkStock()
      } else {
        setUnknown(true)
        setChecked(false)
        setError(
          'The result is unknown. Check inventory before deciding whether to submit another adjustment.',
        )
      }
    }
  }
  return (
    <AdminDialog title={`Adjust stock: ${book.title}`} close={close} busy={loading || checking}>
      <p className="mb-4">
        Current stock: <strong>{stock}</strong>
      </p>
      <form onSubmit={submit} className="space-y-4">
        <FormField
          id="stock-delta"
          label="Quantity change"
          inputMode="numeric"
          value={delta}
          onChange={(event) => setDelta(event.target.value)}
        />
        <p className="text-sm">
          Positive adds stock; negative removes stock. Estimated result:{' '}
          {stock + (Number(delta) || 0)}.
        </p>
        {error && <Alert role="alert" variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
        {unknown && (
          <>
            <Button
              type="button"
              variant="ghost"
              disabled={checking}
              onClick={() => {
                void checkStock()
              }}
            >
              Check inventory
            </Button>
            {checked && (
              <p role="status" className="text-sm">
                Inventory refreshed. This does not confirm whether the earlier adjustment ran.
                Review the quantity change before another deliberate submission.
              </p>
            )}
          </>
        )}
        <Button type="submit" disabled={loading || checking || (unknown && !checked)}>
          {loading ? 'Saving…' : 'Apply adjustment'}
        </Button>
      </form>
    </AdminDialog>
  )
}
