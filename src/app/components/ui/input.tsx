import type { ComponentProps } from 'react'
import { cn } from '../../../lib/utils'

export function Input({ className, type, ...props }: ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'w-full border border-control bg-input px-4 py-4 text-sm outline-none focus:border-primary focus-visible:ring-1 focus-visible:ring-ring aria-invalid:border-destructive disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
      {...props}
    />
  )
}
