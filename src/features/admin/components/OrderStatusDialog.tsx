import { errorMessage } from '../../../lib/i18n/errors'
import { localized, message as msg, t, useI18n } from '../../../lib/i18n'
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
  useI18n()

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
        setError(msg('admin:orderRequestNotFoundCloseThisDialogAndRefresh'))
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
            setError(msg('admin:shipmentDetailsChangedCloseThisDialogAndInspectTheSavedShipment'))
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
      setError(msg('admin:unableToRefreshTheRequestRefreshBeforeTryingAgain'))
    } finally {
      setChecking(false)
    }
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    const reason = draft.trim()
    if (target === 'CANCELLED' && (reason.length < 1 || reason.length > 500)) {
      setError(msg('admin:enterAReasonBetween1And500Characters'))
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
      setError(msg('admin:enterACarrier100CharactersOrFewerAnOptionalTrackingNumber'))
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
      setError(msg('admin:enterACarrier100CharactersOrFewerAnOptionalTrackingNumber'))
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
      if (!response.data) throw new Error(msg('admin:unconfirmedResponse'))
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
          setError(msg('admin:theRequestChangedRefreshItsCurrentStatusBeforeConfirmingAFresh'))
          await check(true)
        } else setError(errorMessage(failure, 'common:requestFailed'))
      } else {
        setUncertain(true)
        setChecked(false)
        setError(msg('admin:theOutcomeCouldNotBeConfirmedRefreshTheRequestBeforeA'))
        await check()
      }
    }
  }
  const label =
    target === 'PREPARING'
      ? msg('admin:confirmPreparation')
      : target === 'SHIPPED'
        ? msg('admin:confirmShipment')
        : target === 'DELIVERED'
          ? msg('admin:confirmDelivery')
          : msg('admin:confirmCancellation')
  return (
    <AdminDialog
      title={t('admin:changeOrderRequestValue', { value0: order.id })}
      close={close}
      busy={loading || checking}
    >
      <p>
        {t('admin:currentStatusValueRequestedResultValueValue', {
          value0: orderStatusLabels[order.status],
          value1: ' ',
          value2: orderStatusLabels[target],
        })}
      </p>
      {(loading || checking) && (
        <p role="status">
          {localized(loading ? t('admin:updatingRequest') : t('admin:refreshingRequest'))}
        </p>
      )}
      <form onSubmit={submit} className="space-y-4">
        {target === 'CANCELLED' ? (
          <>
            <Label htmlFor="cancel-reason">{t('admin:reasonShownToCustomer')}</Label>
            <Textarea
              id="cancel-reason"
              value={draft}
              disabled={loading || checking}
              onChange={(event) => setDraft(event.target.value)}
            />
            <p className="text-sm">
              {localized(
                order.payment.status === 'PAID'
                  ? t('admin:aFullRefundIncludingTheDeliveryFeeWillBeRequestedCancellation')
                  : order.payment.required
                    ? t('admin:thePaymentSessionMustCloseBeforeTheReservationIsReleasedAn')
                    : t('admin:theSavedBookQuantitiesReturnToStock'),
              )}
            </p>
          </>
        ) : (
          <div className="space-y-4">
            {target === 'SHIPPED' ? (
              <>
                <p>{t('admin:theBooksHaveLeftTheStoreCancellationWillBeUnavailableShipment')}</p>
                {(
                  [
                    { key: 'carrier', label: t('admin:carrierOptional'), max: 100 },
                    { key: 'trackingNumber', label: t('admin:trackingNumberOptional'), max: 120 },
                    { key: 'trackingUrl', label: t('admin:trackingUrlOptional'), max: 2048 },
                  ] as const
                ).map((field) => (
                  <div key={field.key}>
                    <Label htmlFor={`shipment-${field.key}`}>{localized(field.label)}</Label>
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
                {t('admin:confirmOnlyAfterActualDeliveryConfirmationThisMarksTheOrderDelivered')}
              </p>
            ) : (
              <p>{t('admin:thisBeginsPreparationOfThePaidOrder')}</p>
            )}
          </div>
        )}
        {error && (
          <Alert role="alert" variant="destructive">
            <AlertDescription>{localized(error)}</AlertDescription>
          </Alert>
        )}
        {uncertain && (
          <>
            <Button type="button" variant="ghost" disabled={checking} onClick={() => void check()}>
              {t('admin:refreshRequest')}
            </Button>
            {checked && (
              <p role="status">
                {t('admin:requestRefreshedReviewTheActionBeforeADeliberateRetry')}
              </p>
            )}
          </>
        )}
        <Button
          disabled={loading || checking || (uncertain && (!checked || conflicted))}
          type="submit"
        >
          {localized(loading ? t('admin:saving') : label)}
        </Button>
      </form>
    </AdminDialog>
  )
}
