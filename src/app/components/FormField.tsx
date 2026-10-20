import type { ComponentProps } from 'react'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { localize, useI18n } from '../../lib/i18n'

type FormFieldProps = ComponentProps<typeof Input> & { id: string; label: string; error?: string }

export function FormField({ id, label, error, ...inputProps }: FormFieldProps) {
  useI18n()
  return (
    <div>
      <Label htmlFor={id}>{localize(label)}</Label>
      <Input
        {...inputProps}
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-2 text-sm text-destructive">
          {localize(error)}
        </p>
      )}
    </div>
  )
}
