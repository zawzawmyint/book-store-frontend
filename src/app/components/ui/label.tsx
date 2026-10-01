import type { ComponentProps } from 'react'
import * as LabelPrimitive from '@radix-ui/react-label'
import { cn } from '../../../lib/utils'

export function Label({ className, ...props }: ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn('mb-2 block text-xs font-bold uppercase tracking-[.15em]', className)}
      {...props}
    />
  )
}
