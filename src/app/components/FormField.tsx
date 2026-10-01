import type { ComponentProps } from 'react'
import { Input } from './ui/input'
import { Label } from './ui/label'

type FormFieldProps = ComponentProps<typeof Input> & { id: string; label: string; error?: string }

export function FormField({ id, label, error, ...inputProps }: FormFieldProps) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input
        {...inputProps}
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-2 text-sm text-[#a14134]">
          {error}
        </p>
      )}
    </div>
  )
}
