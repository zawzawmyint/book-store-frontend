import type { ComponentProps } from 'react'
import { Command as CommandPrimitive } from 'cmdk'
import { cn } from '../../../lib/utils'
import { InputGroupInput } from './input-group'

// A non-item value keeps server results unselected until an explicit user action.
export const COMMAND_NO_SELECTION = '__command_no_selection__'

export function Command({
  className,
  onKeyDownCapture,
  ...props
}: ComponentProps<typeof CommandPrimitive>) {
  return (
    <CommandPrimitive
      data-slot="command"
      className={cn('flex min-h-0 w-full flex-col text-foreground', className)}
      onKeyDownCapture={(event) => {
        onKeyDownCapture?.(event)
        // Retry, close and other buttons keep their native keyboard behavior.
        if (!(event.target instanceof HTMLElement) || event.target.hasAttribute('cmdk-input'))
          return
        if (['Enter', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key))
          event.stopPropagation()
      }}
      {...props}
    />
  )
}

export function CommandInput({
  value = '',
  onValueChange,
  ...props
}: Omit<ComponentProps<typeof CommandPrimitive.Input>, 'asChild'>) {
  return (
    // Server search owns the query. Keeping cmdk's local query empty prevents its
    // automatic first-item selection when the query changes; asChild supplies the
    // actual displayed value while retaining cmdk's combobox wiring.
    <CommandPrimitive.Input asChild value="">
      <InputGroupInput
        {...props}
        value={value}
        aria-labelledby={props['aria-labelledby']}
        onChange={(event) => onValueChange?.(event.target.value)}
      />
    </CommandPrimitive.Input>
  )
}

export function CommandList({ className, ...props }: ComponentProps<typeof CommandPrimitive.List>) {
  return (
    <CommandPrimitive.List
      data-slot="command-list"
      className={cn('min-h-0 outline-none', className)}
      {...props}
    />
  )
}

export function CommandGroup({
  className,
  ...props
}: ComponentProps<typeof CommandPrimitive.Group>) {
  return (
    <CommandPrimitive.Group
      data-slot="command-group"
      className={cn('text-foreground', className)}
      {...props}
    />
  )
}

export function CommandItem({ className, ...props }: ComponentProps<typeof CommandPrimitive.Item>) {
  return (
    <CommandPrimitive.Item
      data-slot="command-item"
      className={cn(
        'cursor-default outline-none data-[selected=true]:bg-muted data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50',
        className,
      )}
      {...props}
    />
  )
}
