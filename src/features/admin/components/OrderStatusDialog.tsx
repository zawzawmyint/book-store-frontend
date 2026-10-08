import { Input } from '../../../app/components/ui/input'
import { safeTrackingUrl } from '../../orders/tracking-url'
import { useState } from 'react'
import { CombinedGraphQLErrors } from '@apollo/client'
import { useMutation } from '@apollo/client/react'
import {
  SetOrderStatusDocument,
  type AdminOrderDetailFragment,
  type OrderStatus,
} from '../../../generated/graphql'
import { Button } from '../../../app/components/ui/button'
import { Label } from '../../../app/components/ui/label'
import { Textarea } from '../../../app/components/ui/textarea'
import { Alert, AlertDescription } from '../../../app/components/ui/alert'
import { AdminDialog } from './AdminDialog'
import { useAdminAccess } from '../admin-access'
import { orderStatusLabels } from '../../orders/order-status'
export function OrderStatusDialog({
  order,
  target,
  close,
  refreshed,
  refresh,
  saved,
  draft,
  setDraft,
}: {
  order: AdminOrderDetailFragment
  target: OrderStatus
  close: () => void
  refreshed: (order: AdminOrderDetailFragment) => void
  refresh: () => Promise<AdminOrderDetailFragment | null | undefined>
  saved: (order: AdminOrderDetailFragment) => void
  draft: string
  setDraft: (value: string) => void
}) {
  const [mutate, { loading }] = useMutation(SetOrderStatusDocument)
  const { handleError } = useAdminAccess()
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)
  const [uncertain, setUncertain] = useState(false)
  const [conflicted, setConflicted] = useState(false)
  const [checked, setChecked] = useState(false)
  const [shipment, setShipment] = useState({ carrier: '', trackingNumber: '', trackingUrl: '' })
  async function check(conflict = conflicted) {
    setChecking(true)
    try {
      const current = await refresh()
      if (!current) {
        setError('Order request not found. Close this dialog and refresh.')
        return
      }
      refreshed(current)
      if (conflict) {
        close()
        return
      }
      if (current.status === target) {
        if (target === 'SHIPPED') {
          const expected = {
            carrier: shipment.carrier.trim(),
            trackingNumber: shipment.trackingNumber.trim() || null,
            trackingUrl: shipment.trackingUrl.trim() || null,
          }
          const actual = current.delivery.shipment
          if (
            JSON.stringify(
              actual
                ? {
                    carrier: actual.carrier,
                    trackingNumber: actual.trackingNumber,
                    trackingUrl: actual.trackingUrl,
                  }
                : null,
            ) !== JSON.stringify(Object.values(expected).some(Boolean) ? expected : null)
          ) {
            setError('Shipment details changed. Close this dialog and inspect the saved shipment.')
            setConflicted(true)
            return
          }
        }
        saved(current)
        return
      }
      if (current.status !== order.status) {
        close()
        return
      }
      setChecked(true)
    } catch (failure) {
      handleError(failure)
      setError('Unable to refresh the request. Refresh before trying again.')
    } finally {
      setChecking(false)
    }
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    const reason = draft.trim()
    if (target === 'CANCELLED' && (reason.length < 1 || reason.length > 500)) {
      setError('Enter a reason between 1 and 500 characters.')
      return
    }
    if (
      target === 'SHIPPED' &&
      Object.values(shipment).some((value) =>
        Array.from(value).some(
          (c) => c.charCodeAt(0) < 32 || (c.charCodeAt(0) >= 127 && c.charCodeAt(0) <= 159),
        ),
      )
    ) {
      setError(
        'Enter a carrier (100 characters or fewer), an optional tracking number (120 or fewer), and a valid HTTPS URL only with a tracking number.',
      )
      return
    }
    const normalizedShipment = {
      carrier: shipment.carrier.trim(),
      trackingNumber: shipment.trackingNumber.trim() || null,
      trackingUrl: shipment.trackingUrl.trim() || null,
    }
    const hasShipment = Object.values(normalizedShipment).some(Boolean)
    if (
      target === 'SHIPPED' &&
      hasShipment &&
      (!normalizedShipment.carrier ||
        normalizedShipment.carrier.length > 100 ||
        (normalizedShipment.trackingNumber?.length ?? 0) > 120 ||
        (normalizedShipment.trackingUrl &&
          (!normalizedShipment.trackingNumber ||
            normalizedShipment.trackingUrl.length > 2048 ||
            !safeTrackingUrl(normalizedShipment.trackingUrl))))
    ) {
      setError(
        'Enter a carrier (100 characters or fewer), an optional tracking number (120 or fewer), and a valid HTTPS URL only with a tracking number.',
      )
      return
    }
    setError('')
    try {
      const response = await mutate({
        variables: {
          input: {
            id: order.id,
            expectedStatus: order.status,
            status: target,
            ...(target === 'CANCELLED' ? { cancellationReason: reason } : {}),
            ...(target === 'SHIPPED' && hasShipment ? { shipment: normalizedShipment } : {}),
          },
        },
      })
      if (!response.data) throw new Error('Unconfirmed response')
      saved(response.data.setOrderStatus)
    } catch (failure) {
      handleError(failure)
      if (CombinedGraphQLErrors.is(failure)) {
        if (
          failure.errors.some(
            (entry) =>
              entry.extensions?.code === 'CONFLICT' ||
              entry.extensions?.code === 'PAYMENT_UNAVAILABLE',
          )
        ) {
          setConflicted(true)
          setUncertain(true)
          setChecked(false)
          setError(
            'The request changed. Refresh its current status before confirming a fresh action.',
          )
          await check(true)
        } else setError(failure.message)
      } else {
        setUncertain(true)
        setChecked(false)
        setError(
          'The outcome could not be confirmed. Refresh the request before a deliberate retry.',
        )
        await check()
      }
    }
  }
  const label =
    target === 'PREPARING'
      ? 'Confirm preparation'
      : target === 'SHIPPED'
        ? 'Confirm shipment'
        : target === 'DELIVERED'
          ? 'Confirm delivery'
          : 'Confirm cancellation'
  return (
    <AdminDialog
      title={`Change order request #${order.id}`}
      close={close}
      busy={loading || checking}
    >
      <p>
        Current status: {orderStatusLabels[order.status]}. Requested result:{' '}
        {orderStatusLabels[target]}.
      </p>
      {(loading || checking) && (
        <p role="status">{loading ? 'Updating request…' : 'Refreshing request…'}</p>
      )}
      <form onSubmit={submit} className="space-y-4">
        {target === 'CANCELLED' ? (
          <>
            <Label htmlFor="cancel-reason">Reason shown to customer</Label>
            <Textarea
              id="cancel-reason"
              value={draft}
              disabled={loading || checking}
              onChange={(event) => setDraft(event.target.value)}
            />
            <p className="text-sm">
              {order.payment.status === 'PAID'
                ? 'A full refund including the delivery fee will be requested. Cancellation does not confirm the refund.'
                : order.payment.required
                  ? 'The payment session must close before the reservation is released. An uncertain result needs confirmation.'
                  : 'The saved book quantities return to stock.'}
            </p>
          </>
        ) : (
          <div className="space-y-4">
            {target === 'SHIPPED' ? (
              <>
                <p>
                  The books have left the store; cancellation will be unavailable. Shipment details
                  are optional.
                </p>
                {(
                  [
                    { key: 'carrier', label: 'Carrier (optional)', max: 100 },
                    { key: 'trackingNumber', label: 'Tracking number (optional)', max: 120 },
                    { key: 'trackingUrl', label: 'Tracking URL (optional)', max: 2048 },
                  ] as const
                ).map((field) => (
                  <div key={field.key}>
                    <Label htmlFor={`shipment-${field.key}`}>{field.label}</Label>
                    <Input
                      id={`shipment-${field.key}`}
                      maxLength={field.max}
                      disabled={loading || checking}
                      value={shipment[field.key]}
                      onChange={(event) =>
                        setShipment({ ...shipment, [field.key]: event.target.value })
                      }
                    />
                  </div>
                ))}
              </>
            ) : target === 'DELIVERED' ? (
              <p>
                Confirm only after actual delivery confirmation. This marks the order Delivered.
              </p>
            ) : (
              <p>This begins preparation of the paid order.</p>
            )}
          </div>
        )}
        {error && (
          <Alert role="alert" variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {uncertain && (
          <>
            <Button type="button" variant="ghost" disabled={checking} onClick={() => void check()}>
              Refresh request
            </Button>
            {checked && (
              <p role="status">Request refreshed. Review the action before a deliberate retry.</p>
            )}
          </>
        )}
        <Button
          disabled={loading || checking || (uncertain && (!checked || conflicted))}
          type="submit"
        >
          {loading ? 'Saving…' : label}
        </Button>
      </form>
    </AdminDialog>
  )
}
