import type { ComponentProps } from 'react'
import { cn } from '../../../lib/utils'
import { Input } from './input'
import { Button } from './button'

export function InputGroup({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="input-group"
      role="group"
      className={cn(
        'group/input-group relative flex w-full min-w-0 items-center rounded-sm border border-control bg-input focus-within:border-primary focus-within:ring-1 focus-within:ring-ring has-[[aria-invalid=true]]:border-destructive has-[:disabled]:opacity-60',
        className,
      )}
      {...props}
    />
  )
}

export function InputGroupAddon({
  className,
  align = 'inline-start',
  ...props
}: ComponentProps<'div'> & {
  align?: 'inline-start' | 'inline-end' | 'block-start' | 'block-end'
}) {
  return (
    <div
      data-slot="input-group-addon"
      data-align={align}
      className={cn(
        'flex shrink-0 items-center justify-center gap-2 text-sm text-muted-foreground [&_svg]:size-4',
        align === 'inline-start' && 'order-first ps-3',
        align === 'inline-end' && 'order-last pe-2',
        align === 'block-start' && 'order-first w-full px-3 pt-3',
        align === 'block-end' && 'order-last w-full px-3 pb-3',
        className,
      )}
      {...props}
    />
  )
}

export function InputGroupInput({ className, ...props }: ComponentProps<typeof Input>) {
  return (
    <Input
      data-slot="input-group-control"
      className={cn(
        'min-w-0 flex-1 border-0 bg-transparent shadow-none focus:border-transparent focus-visible:ring-0',
        className,
      )}
      {...props}
    />
  )
}

export function InputGroupButton({
  className,
  type = 'button',
  variant = 'ghost',
  size = 'xs',
  ...props
}: ComponentProps<typeof Button> & { size?: 'xs' | 'sm' | 'icon-xs' | 'icon-sm' }) {
  return (
    <Button
      type={type}
      variant={variant}
      data-size={size}
      className={cn(
        'shrink-0 rounded-sm text-sm',
        size === 'xs' && 'min-h-11 px-2',
        size === 'sm' && 'min-h-11 px-3',
        (size === 'icon-xs' || size === 'icon-sm') && 'size-11 p-2.5 [&_svg]:size-5',
        className,
      )}
      {...props}
    />
  )
}
