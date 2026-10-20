import type { ComponentProps } from 'react'
import { Input } from './ui/input'
import { Field, FieldLabel, FieldError } from './ui/field'
import { InputGroup, InputGroupAddon, InputGroupInput } from './ui/input-group'
import { localize, useI18n } from '../../lib/i18n'

type FormFieldProps = ComponentProps<typeof Input> & {
  id: string
  label: string
  error?: string
  suffix?: string
}

export function FormField({
  id,
  label,
  error,
  suffix,
  'aria-describedby': describedBy,
  ...inputProps
}: FormFieldProps) {
  useI18n()
  const Control = suffix ? InputGroupInput : Input
  const control = (
    <Control
      {...inputProps}
      id={id}
      aria-invalid={Boolean(error)}
      aria-describedby={
        [describedBy, error ? `${id}-error` : undefined].filter(Boolean).join(' ') || undefined
      }
    />
  )
  return (
    <Field data-invalid={Boolean(error)}>
      <FieldLabel htmlFor={id}>{localize(label)}</FieldLabel>
      {suffix ? (
        <InputGroup>
          {control}
          <InputGroupAddon align="inline-end">{localize(suffix)}</InputGroupAddon>
        </InputGroup>
      ) : (
        control
      )}
      {error && <FieldError id={`${id}-error`}>{localize(error)}</FieldError>}
    </Field>
  )
}
