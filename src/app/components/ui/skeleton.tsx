import type { ComponentProps } from 'react'
import { cn } from '../../../lib/utils'

export function Skeleton({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="skeleton" aria-hidden="true" className={cn('animate-pulse rounded-md bg-[#e2ded4]', className)} {...props} />
}
