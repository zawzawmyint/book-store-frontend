import type { ComponentProps } from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva } from 'class-variance-authority'
import type { VariantProps } from 'class-variance-authority'
import { cn } from '../../../lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'primary-action',
        ghost: 'hover:bg-muted',
        outline: 'border border-control bg-transparent hover:bg-muted',
        secondary: 'bg-secondary text-foreground hover:bg-muted',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive-hover',
        link: 'p-0 text-primary underline underline-offset-4 hover:text-muted-foreground',
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
