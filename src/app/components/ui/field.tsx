import type { ComponentProps } from 'react'
import { cn } from '../../../lib/utils'
import { Label } from './label'

export function Field({
  className,
  orientation = 'vertical',
  ...props
}: ComponentProps<'div'> & { orientation?: 'vertical' | 'horizontal' | 'responsive' }) {
  return (
    <div
      data-slot="field"
      data-orientation={orientation}
      className={cn(
        'min-w-0',
        orientation === 'horizontal' && 'flex items-start gap-3',
        orientation === 'responsive' && 'flex flex-col sm:flex-row sm:gap-3',
        className,
      )}
      {...props}
    />
  )
}
export function FieldLabel(props: ComponentProps<typeof Label>) {
  return <Label data-slot="field-label" {...props} />
}
export function FieldDescription({ className, ...props }: ComponentProps<'p'>) {
  return (
    <p
      data-slot="field-description"
      className={cn('mt-2 text-sm text-muted-foreground', className)}
      {...props}
    />
  )
}
export function FieldError({ className, ...props }: ComponentProps<'p'>) {
  return (
    <p
      role="alert"
      data-slot="field-error"
      className={cn('mt-2 text-sm text-destructive', className)}
      {...props}
    />
  )
}
