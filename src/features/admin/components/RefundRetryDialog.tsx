import { localized, message as msg, t, useI18n } from '../../../lib/i18n'
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
  useI18n()

  const [retry, { loading }] = useMutation(RetryOrderRefundDocument)
  const [error, setError] = useState('')
  const [uncertain, setUncertain] = useState(false)
  const { handleError } = useAdminAccess()
  async function submit() {
    if (loading || uncertain) return
    try {
      const result = await retry({ variables: { orderId: order.id } })
      if (!result.data) throw new Error(msg('admin:unconfirmedRefund'))
      saved(result.data.retryOrderRefund)
      close()
    } catch (failure) {
      handleError(failure)
      setUncertain(true)
      setError(msg('admin:refundOutcomeIsUncertainRefreshTheOrderBeforeADeliberateRetry'))
    }
  }
  return (
    <AdminDialog title={t('admin:retryFullRefund')} close={close} busy={loading}>
      <p>
        {t('admin:requestAFullRefundForCancelledOrderValueTheServerConfirms', { value0: order.id })}
      </p>
      {error && <p role="alert">{localized(error)}</p>}
      {uncertain ? (
        <Button
          onClick={async () => {
            await refresh()
            close()
          }}
        >
          {t('admin:refreshOrder')}
        </Button>
      ) : (
        <Button disabled={loading} onClick={() => void submit()}>
          {localized(loading ? t('admin:requestingRefund') : t('admin:confirmRefundRetry'))}
        </Button>
      )}
    </AdminDialog>
  )
}
