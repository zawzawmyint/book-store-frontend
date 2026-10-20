import type { ComponentProps } from 'react'
import { cn } from '../../../lib/utils'

export function Empty({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="empty"
      className={cn(
        'flex min-w-0 flex-col items-center justify-center gap-6 p-6 text-center',
        className,
      )}
      {...props}
    />
  )
}
export function EmptyHeader({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="empty-header"
      className={cn('flex max-w-sm flex-col items-center gap-2', className)}
      {...props}
    />
  )
}
export function EmptyMedia({
  className,
  variant = 'default',
  ...props
}: ComponentProps<'div'> & { variant?: 'default' | 'icon' }) {
  return (
    <div
      data-slot="empty-media"
      data-variant={variant}
      className={cn(
        'mb-2 flex shrink-0 items-center justify-center text-muted-foreground [&_svg]:shrink-0',
        variant === 'icon' && 'size-10 rounded-lg bg-muted [&_svg]:size-5',
        className,
      )}
      {...props}
    />
  )
}
export function EmptyTitle({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="empty-title" className={cn('text-lg font-medium', className)} {...props} />
}
export function EmptyDescription({ className, ...props }: ComponentProps<'p'>) {
  return (
    <p
      data-slot="empty-description"
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  )
}
export function EmptyContent({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="empty-content"
      className={cn('flex w-full max-w-sm min-w-0 flex-col items-center gap-4 text-sm', className)}
      {...props}
    />
  )
}
