import type { ComponentProps } from 'react'
import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import { Check } from 'lucide-react'
import { cn } from '../../../lib/utils'

export function Checkbox({ className, ...props }: ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root data-slot="checkbox" className={cn('peer size-4 shrink-0 rounded-sm border border-[#6e756c] bg-[#fbfaf6] outline-none focus-visible:ring-2 focus-visible:ring-[#32734f] disabled:cursor-not-allowed disabled:opacity-60 data-[state=checked]:border-[#28593f] data-[state=checked]:bg-[#28593f] data-[state=checked]:text-white', className)} {...props}>
      <CheckboxPrimitive.Indicator data-slot="checkbox-indicator" className="grid place-items-center"><Check className="size-3.5" /></CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}
