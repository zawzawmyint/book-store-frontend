import { useState } from 'react'
import { useMutation } from '@apollo/client/react'
import { RetryOrderRefundDocument, type AdminOrderDetailFragment } from '../../../generated/graphql'
import { Button } from '../../../app/components/ui/button'
import { AdminDialog } from './AdminDialog'
import { useAdminAccess } from '../admin-access'
export function RefundRetryDialog({
  order,
  close,
  saved,
  refresh,
}: {
  order: AdminOrderDetailFragment
  close: () => void
  saved: (order: AdminOrderDetailFragment) => void
  refresh: () => Promise<unknown>
}) {
  const [retry, { loading }] = useMutation(RetryOrderRefundDocument)
  const [error, setError] = useState('')
  const [uncertain, setUncertain] = useState(false)
  const { handleError } = useAdminAccess()
  async function submit() {
    if (loading || uncertain) return
    try {
      const result = await retry({ variables: { orderId: order.id } })
      if (!result.data) throw new Error('Unconfirmed refund')
      saved(result.data.retryOrderRefund)
      close()
    } catch (failure) {
      handleError(failure)
      setUncertain(true)
      setError('Refund outcome is uncertain. Refresh the order before a deliberate retry.')
    }
  }
  return (
    <AdminDialog title="Retry full refund" close={close} busy={loading}>
      <p>Request a full refund for cancelled order #{order.id}. The server confirms its outcome.</p>
      {error && <p role="alert">{error}</p>}
      {uncertain ? (
        <Button
          onClick={async () => {
            await refresh()
            close()
          }}
        >
          Refresh order
        </Button>
      ) : (
        <Button disabled={loading} onClick={() => void submit()}>
          {loading ? 'Requesting refund…' : 'Confirm refund retry'}
        </Button>
      )}
    </AdminDialog>
  )
}
