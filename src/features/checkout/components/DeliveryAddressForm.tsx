import { errorMessage } from '../../../lib/i18n/errors'
import { localized, t, useI18n } from '../../../lib/i18n'
import { useEffect, useState } from 'react'
import { useWatch, type UseFormReturn } from 'react-hook-form'
import type { DeliveryOptionsQuery } from '../../../generated/graphql'
import {
  countryName,
  type DeliveryAddress,
  type DeliveryAddressForm as AddressFormValues,
} from '../delivery-address'
import { money } from '../../../lib/format'
import { Button } from '../../../app/components/ui/button'
import { BookLoader } from '../../../app/components/BookLoader'
import { Input } from '../../../app/components/ui/input'
import { Field, FieldLabel, FieldError } from '../../../app/components/ui/field'

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
  {
    name: 'recipientName',
    get label() {
      return t('storefront:recipientName')
    },
    max: 120,
    autoComplete: 'shipping name',
  },
  {
    name: 'phone',
    get label() {
      return t('storefront:phoneNumber')
    },
    max: 32,
    autoComplete: 'shipping tel',
  },
  {
    name: 'addressLine1',
    get label() {
      return t('storefront:addressLine1')
    },
    max: 200,
    autoComplete: 'shipping address-line1',
  },
  {
    name: 'addressLine2',
    get label() {
      return t('storefront:addressLine2Optional')
    },
    max: 200,
    autoComplete: 'shipping address-line2',
  },
  {
    name: 'city',
    get label() {
      return t('storefront:city')
    },
    max: 100,
    autoComplete: 'shipping address-level2',
  },
  {
    name: 'region',
    get label() {
      return t('storefront:regionOptional')
    },
    max: 100,
    autoComplete: 'shipping address-level1',
  },
  {
    name: 'postalCode',
    get label() {
      return t('storefront:postalCodeOptional')
    },
    max: 32,
    autoComplete: 'shipping postal-code',
  },
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
  useI18n()

  const [line2Expanded, setLine2Expanded] = useState(false)
  const line2 = useWatch({ control: form.control, name: 'addressLine2' })
  const showLine2 = line2Expanded || !!line2 || !!form.formState.errors.addressLine2
  useEffect(() => {
    if (line2Expanded) form.setFocus('addressLine2')
  }, [line2Expanded, form])
  return (
    <form
      className="space-y-6"
      onSubmit={(event) => void form.handleSubmit(onReview)(event)}
      onChange={onInvalidate}
    >
      <div>
        <h2 className="font-serif text-2xl">{t('storefront:deliveryAddress')}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {t('storefront:whereShouldWeSendYourNextChapter')}
        </p>
      </div>
      {optionsLoading && <BookLoader compact label={t('storefront:loadingDeliveryOptions')} />}
      {optionsError && (
        <p role="alert">
          {localized(errorMessage(optionsError, 'common:requestFailed'))}
          <Button type="button" variant="ghost" onClick={onRetryOptions}>
            {t('storefront:retryDeliveryOptions')}
          </Button>
        </p>
      )}
      <fieldset disabled={paymentLoading} className="grid min-w-0 gap-x-5 gap-y-5 sm:grid-cols-2">
        {fields.map((field) => (
          <div
            key={field.name}
            className={field.name.startsWith('addressLine') ? 'sm:col-span-2' : undefined}
          >
            {field.name === 'addressLine2' && !showLine2 ? (
              <Button
                type="button"
                variant="link"
                className="min-h-11 whitespace-normal text-start text-sm"
                aria-expanded={false}
                aria-controls="optional-address-line"
                onClick={() => setLine2Expanded(true)}
              >
                {t('storefront:addApartmentSuiteEtcOptional')}
              </Button>
            ) : null}
            <div id={field.name === 'addressLine2' ? 'optional-address-line' : undefined}>
              {(field.name !== 'addressLine2' || showLine2) && (
                <Field data-invalid={!!form.formState.errors[field.name]}>
                  <FieldLabel htmlFor={field.name}>{localized(field.label)}</FieldLabel>
                  <Input
                    id={field.name}
                    autoComplete={field.autoComplete}
                    type={field.name === 'phone' ? 'tel' : 'text'}
                    maxLength={field.max}
                    {...form.register(field.name)}
                    aria-invalid={!!form.formState.errors[field.name]}
                    aria-describedby={
                      form.formState.errors[field.name] ? `${field.name}-error` : undefined
                    }
                  />
                  {form.formState.errors[field.name] && (
                    <FieldError
                      className="mt-2 text-sm text-destructive"
                      role="alert"
                      id={`${field.name}-error`}
                    >
                      {localized(form.formState.errors[field.name]?.message)}
                    </FieldError>
                  )}
                </Field>
              )}
            </div>
          </div>
        ))}
        <Field data-invalid={!!form.formState.errors.countryCode}>
          <FieldLabel htmlFor="countryCode">{t('storefront:country')}</FieldLabel>
          <select
            id="countryCode"
            autoComplete="shipping country"
            className="h-[58px] w-full border border-control bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            {...form.register('countryCode')}
            aria-invalid={!!form.formState.errors.countryCode}
            aria-describedby={form.formState.errors.countryCode ? 'country-error' : undefined}
          >
            <option value="">{t('storefront:chooseACountry2')}</option>
            {deliveryOptions?.countryCodes.map((code) => (
              <option key={code} value={code}>
                {localized(countryName(code))}
              </option>
            ))}
          </select>
          {form.formState.errors.countryCode && (
            <FieldError id="country-error">
              {localized(form.formState.errors.countryCode.message)}
            </FieldError>
          )}
        </Field>
      </fieldset>
      {deliveryOptions && (
        <p className="text-sm text-muted-foreground">
          {t('storefront:configuredDeliveryPerOrderValueValueConfirmedAtReview', {
            value0: ' ',
            value1:
              deliveryOptions.feeCents === 0
                ? t('storefront:freeDelivery')
                : money(deliveryOptions.feeCents),
          })}
        </p>
      )}
      <Button
        type="submit"
        className="min-h-11 w-full"
        disabled={reviewing || optionsLoading || !!optionsError || !deliveryOptions}
      >
        {localized(reviewing ? t('storefront:reviewing') : t('storefront:reviewOrder'))}
      </Button>
    </form>
  )
}
