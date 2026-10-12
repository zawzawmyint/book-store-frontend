import type { UseFormReturn } from 'react-hook-form'
import type { DeliveryOptionsQuery } from '../../../generated/graphql'
import {
  countryName,
  type DeliveryAddress,
  type DeliveryAddressForm as AddressFormValues,
} from '../delivery-address'
import { money } from '../../../lib/format'
import { Button } from '../../../app/components/ui/button'
import { Input } from '../../../app/components/ui/input'
import { Label } from '../../../app/components/ui/label'

type DeliveryAddressFormProps = {
  form: UseFormReturn<AddressFormValues, unknown, DeliveryAddress>
  deliveryOptions: DeliveryOptionsQuery['deliveryOptions'] | undefined
  optionsLoading: boolean
  optionsError: { message: string } | undefined
  paymentLoading: boolean
  reviewing: boolean
  onReview: (address: DeliveryAddress) => Promise<void>
  onInvalidate: () => void
  onRetryOptions: () => void
}

const fields = [
  { name: 'recipientName', label: 'Recipient name', max: 120 },
  { name: 'phone', label: 'Phone number', max: 32 },
  { name: 'addressLine1', label: 'Address line 1', max: 200 },
  { name: 'addressLine2', label: 'Address line 2 (optional)', max: 200 },
  { name: 'city', label: 'City', max: 100 },
  { name: 'region', label: 'Region (optional)', max: 100 },
  { name: 'postalCode', label: 'Postal code (optional)', max: 32 },
] as const

export function DeliveryAddressForm({
  form,
  deliveryOptions,
  optionsLoading,
  optionsError,
  paymentLoading,
  reviewing,
  onReview,
  onInvalidate,
  onRetryOptions,
}: DeliveryAddressFormProps) {
  return (
    <form
      className="mt-8 space-y-5"
      onSubmit={(event) => void form.handleSubmit(onReview)(event)}
      onChange={onInvalidate}
    >
      <h2 className="font-semibold">Delivery address</h2>
      {optionsLoading && <p role="status">Loading delivery options…</p>}
      {optionsError && (
        <p role="alert">
          {optionsError.message}
          <Button type="button" variant="ghost" onClick={onRetryOptions}>
            Retry delivery options
          </Button>
        </p>
      )}
      <fieldset disabled={paymentLoading} className="space-y-4">
        {fields.map((field) => (
          <div key={field.name}>
            <Label htmlFor={field.name}>{field.label}</Label>
            <Input
              id={field.name}
              type={field.name === 'phone' ? 'tel' : 'text'}
              maxLength={field.max}
              {...form.register(field.name)}
              aria-invalid={!!form.formState.errors[field.name]}
              aria-describedby={
                form.formState.errors[field.name] ? `${field.name}-error` : undefined
              }
            />
            {form.formState.errors[field.name] && (
              <p role="alert" id={`${field.name}-error`}>
                {form.formState.errors[field.name]?.message}
              </p>
            )}
          </div>
        ))}
        <div>
          <Label htmlFor="countryCode">Country</Label>
          <select
            id="countryCode"
            className="h-10 w-full rounded-md border bg-background px-3"
            {...form.register('countryCode')}
            aria-invalid={!!form.formState.errors.countryCode}
            aria-describedby={form.formState.errors.countryCode ? 'country-error' : undefined}
          >
            <option value="">Choose a country</option>
            {deliveryOptions?.countryCodes.map((code) => (
              <option key={code} value={code}>
                {countryName(code)}
              </option>
            ))}
          </select>
          {form.formState.errors.countryCode && (
            <p role="alert" id="country-error">
              {form.formState.errors.countryCode.message}
            </p>
          )}
        </div>
      </fieldset>
      {deliveryOptions && (
        <p>
          Delivery per order:{' '}
          {deliveryOptions.feeCents === 0 ? 'Free delivery' : money(deliveryOptions.feeCents)}
        </p>
      )}
      <Button
        type="submit"
        disabled={reviewing || optionsLoading || !!optionsError || !deliveryOptions}
      >
        {reviewing ? 'Reviewing…' : 'Review order'}
      </Button>
    </form>
  )
}
