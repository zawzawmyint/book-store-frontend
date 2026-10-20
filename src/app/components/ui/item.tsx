import type { ComponentProps } from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cn } from '../../../lib/utils'

export function Item({
  className,
  asChild = false,
  variant = 'default',
  size = 'default',
  ...props
}: ComponentProps<'div'> & {
  asChild?: boolean
  variant?: 'default' | 'outline' | 'muted'
  size?: 'default' | 'sm'
}) {
  const Comp = asChild ? Slot : 'div'
  return (
    <Comp
      data-slot="item"
      data-variant={variant}
      data-size={size}
      className={cn(
        'flex min-w-0 items-center gap-4 rounded-md',
        size === 'sm' ? 'p-3' : 'p-4',
        variant === 'outline' && 'border border-border',
        variant === 'muted' && 'bg-muted',
        className,
      )}
      {...props}
    />
  )
}
export function ItemContent({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="item-content"
      className={cn('flex min-w-0 flex-1 flex-col gap-1', className)}
      {...props}
    />
  )
}
export function ItemTitle({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="item-title" className={cn('text-sm font-medium', className)} {...props} />
}
export function ItemDescription({ className, ...props }: ComponentProps<'p'>) {
  return (
    <p
      data-slot="item-description"
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  )
}
export function ItemMedia({
  className,
  variant = 'default',
  ...props
}: ComponentProps<'div'> & { variant?: 'default' | 'icon' | 'image' }) {
  return (
    <div
      data-slot="item-media"
      data-variant={variant}
      className={cn(
        'flex shrink-0 items-center justify-center',
        variant === 'icon' && 'size-8 rounded-md border border-border [&_svg]:size-4',
        variant === 'image' &&
          'size-10 overflow-hidden rounded-sm [&_img]:size-full [&_img]:object-cover',
        className,
      )}
      {...props}
    />
  )
}
export function ItemActions({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="item-actions"
      className={cn('flex shrink-0 items-center gap-2', className)}
      {...props}
    />
  )
}
