import type { ComponentProps } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../../lib/utils'

const badgeVariants = cva('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold', {
  variants: {
    variant: {
      default: 'border-[#28593f] bg-[#28593f] text-white',
      secondary: 'border-[#d8d5ca] bg-[#e6e0d3] text-[#26342e]',
      destructive: 'border-[#a14134] bg-[#fff2ed] text-[#842f25]',
      outline: 'border-[#d8d5ca] text-[#26342e]',
    },
  },
  defaultVariants: { variant: 'default' },
})

export function Badge({ className, variant, ...props }: ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
}
