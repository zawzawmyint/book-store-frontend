import type { ComponentProps } from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva } from 'class-variance-authority'
import type { VariantProps } from 'class-variance-authority'
import { cn } from '../../../lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#32734f] [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'primary-action',
        ghost: 'hover:bg-[#eeece5]',
        outline: 'border border-[#d8d5ca] bg-transparent hover:bg-[#eeece5]',
        secondary: 'bg-[#e6e0d3] text-[#26342e] hover:bg-[#d8d1c3]',
        destructive: 'bg-[#a14134] text-white hover:bg-[#842f25]',
        link: 'p-0 text-[#28593f] underline underline-offset-4 hover:text-[#1e4331]',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

export function Button({
  className,
  variant,
  asChild = false,
  ...props
}: ComponentProps<'button'> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'button'
  return (
    <Comp data-slot="button" className={cn(buttonVariants({ variant, className }))} {...props} />
  )
}
