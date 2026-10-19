import { errorMessage } from '../../../lib/i18n/errors'
import { localized, message as msg, t, useI18n } from '../../../lib/i18n'
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
  useI18n()

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
      if (!result.data?.adminBook) throw new Error(msg('admin:bookWasNotFound'))
      setStock(result.data.adminBook.stock)
      setChecked(true)
    } catch (failure) {
      handleError(failure)
      setError(errorMessage(failure, 'admin:unableToRefreshStock'))
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
      saved(msg('admin:stockUpdatedToValue', { value0: response.data!.adjustBookStock.stock }))
      void refreshCatalog(client).catch(() => {})
    } catch (failure) {
      handleError(failure)
      if (CombinedGraphQLErrors.is(failure)) {
        setError(errorMessage(failure, 'admin:unableToRefreshStock'))
        await checkStock()
      } else {
        setUnknown(true)
        setChecked(false)
        setError(msg('admin:theResultIsUnknownCheckInventoryBeforeDecidingWhetherToSubmit'))
      }
    }
  }
  return (
    <AdminDialog
      title={t('admin:adjustStockValue', { value0: book.title })}
      close={close}
      busy={loading || checking}
    >
      <p className="mb-4">
        {t('admin:currentStock')} <strong>{localized(stock)}</strong>
      </p>
      <form onSubmit={submit} className="space-y-4">
        <FormField
          id="stock-delta"
          label={t('admin:quantityChange')}
          inputMode="numeric"
          value={delta}
          onChange={(event) => setDelta(event.target.value)}
        />
        <p className="text-xs text-muted-foreground">{t('common:wholeNumberHint')}</p>
        <p className="text-sm">
          {t('admin:positiveAddsStockNegativeRemovesStockEstimatedResultValueValue', {
            value0: ' ',
            value1: stock + (Number(delta) || 0),
          })}
        </p>
        {error && (
          <Alert role="alert" variant="destructive">
            <AlertDescription>{localized(error)}</AlertDescription>
          </Alert>
        )}
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
              {t('admin:checkInventory')}
            </Button>
            {checked && (
              <p role="status" className="text-sm">
                {t('admin:inventoryRefreshedThisDoesNotConfirmWhetherTheEarlierAdjustmentRan')}
              </p>
            )}
          </>
        )}
        <Button type="submit" disabled={loading || checking || (unknown && !checked)}>
          {localized(loading ? t('admin:saving') : t('admin:applyAdjustment'))}
        </Button>
      </form>
    </AdminDialog>
  )
}
