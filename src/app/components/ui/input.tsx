import type { ComponentProps } from 'react'
import { cn } from '../../../lib/utils'

export function Input({ className, type, ...props }: ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'w-full border border-[#cfcfc5] bg-[#fbfaf6] px-4 py-4 text-sm outline-none focus:border-[#32734f] focus-visible:ring-1 focus-visible:ring-[#32734f] aria-invalid:border-[#a14134] disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
      {...props}
    />
  )
}
