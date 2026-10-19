import { localized, t, useI18n } from '../../../lib/i18n'
import type { ComponentProps } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { LanguageSwitcher } from '../LanguageSwitcher'

export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogClose = DialogPrimitive.Close

export function DialogPortal(props: ComponentProps<typeof DialogPrimitive.Portal>) {
  useI18n()

  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

export function DialogOverlay({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Overlay>) {
  useI18n()

  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        'fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out',
        className,
      )}
      {...props}
    />
  )
}

export function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: ComponentProps<typeof DialogPrimitive.Content> & { showCloseButton?: boolean }) {
  useI18n()

  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          'fixed top-1/2 left-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto border border-border bg-background p-6 text-foreground shadow-xl focus:outline-none',
          className,
        )}
        {...props}
      >
        {localized(children)}
        <div className="mt-4 flex justify-end">
          <LanguageSwitcher />
        </div>
        {showCloseButton && (
          <DialogPrimitive.Close
            aria-label={t('common:closeDialog')}
            className="absolute end-4 top-4 rounded-sm opacity-70 hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <X className="size-4" aria-hidden="true" />
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

export function DialogHeader({ className, ...props }: ComponentProps<'div'>) {
  useI18n()

  return <div data-slot="dialog-header" className={cn('mb-5 space-y-2', className)} {...props} />
}
export function DialogFooter({ className, ...props }: ComponentProps<'div'>) {
  useI18n()

  return (
    <div
      data-slot="dialog-footer"
      className={cn('mt-5 flex flex-wrap items-center gap-3', className)}
      {...props}
    />
  )
}
export function DialogTitle({ className, ...props }: ComponentProps<typeof DialogPrimitive.Title>) {
  useI18n()

  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn('font-serif text-2xl', className)}
      {...props}
    />
  )
}
export function DialogDescription({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Description>) {
  useI18n()

  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  )
}
