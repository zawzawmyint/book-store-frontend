import type { ComponentProps } from 'react'
import * as SelectPrimitive from '@radix-ui/react-select'
import { Check, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '../../../lib/utils'

export const Select = SelectPrimitive.Root
export const SelectGroup = SelectPrimitive.Group
export const SelectValue = SelectPrimitive.Value

export function SelectTrigger({ className, children, ...props }: ComponentProps<typeof SelectPrimitive.Trigger>) {
  return (
    <SelectPrimitive.Trigger data-slot="select-trigger" className={cn('flex min-h-11 items-center justify-between gap-2 border border-[#d8d5ca] bg-[#fbfaf6] px-3 py-2 text-sm outline-none focus-visible:ring-1 focus-visible:ring-[#32734f] disabled:cursor-not-allowed disabled:opacity-60', className)} {...props}>
      {children}
      <SelectPrimitive.Icon asChild><ChevronDown className="size-4 opacity-60" aria-hidden="true" /></SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
}

export function SelectContent({ className, children, position = 'popper', ...props }: ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content data-slot="select-content" position={position} className={cn('z-50 max-h-72 min-w-[8rem] overflow-hidden border border-[#d8d5ca] bg-[#f7f5f0] text-[#26342e] shadow-md', className)} {...props}>
        <SelectPrimitive.ScrollUpButton className="flex justify-center py-1"><ChevronUp className="size-4" /></SelectPrimitive.ScrollUpButton>
        <SelectPrimitive.Viewport className="p-1">{children}</SelectPrimitive.Viewport>
        <SelectPrimitive.ScrollDownButton className="flex justify-center py-1"><ChevronDown className="size-4" /></SelectPrimitive.ScrollDownButton>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
}

export function SelectItem({ className, children, ...props }: ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item data-slot="select-item" className={cn('relative flex cursor-default select-none items-center py-2 pr-8 pl-3 text-sm outline-none focus:bg-[#e6e0d3] data-[disabled]:opacity-50', className)} {...props}>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator className="absolute right-2"><Check className="size-4" /></SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  )
}

export function SelectLabel({ className, ...props }: ComponentProps<typeof SelectPrimitive.Label>) {
  return <SelectPrimitive.Label data-slot="select-label" className={cn('px-3 py-2 text-xs font-semibold', className)} {...props} />
}
