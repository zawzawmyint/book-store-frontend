import type { ComponentProps } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../../lib/utils'

const alertVariants = cva('w-full border p-4 text-sm', {
  variants: {
    variant: {
      default: 'border-[#d8d5ca] bg-[#eeece5]',
      destructive: 'border-[#e5c9c0] bg-[#fff2ed] text-[#842f25]',
    },
  },
  defaultVariants: { variant: 'default' },
})

export function Alert({ className, variant, ...props }: ComponentProps<'div'> & VariantProps<typeof alertVariants>) {
  return <div data-slot="alert" role="alert" className={cn(alertVariants({ variant }), className)} {...props} />
}
export function AlertTitle({ className, ...props }: ComponentProps<'h5'>) {
  return <h5 data-slot="alert-title" className={cn('mb-1 font-semibold', className)} {...props} />
}
export function AlertDescription({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="alert-description" className={cn('text-sm', className)} {...props} />
}
