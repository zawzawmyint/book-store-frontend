import { localized, t, useI18n } from '../../../lib/i18n'
import { useState } from 'react'
import { Button } from '../../../app/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../app/components/ui/dialog'

export function AdminDialog({
  title,
  children,
  close,
  busy,
  returnFocusTo,
  returnFocusFallback,
}: {
  title: string
  children: React.ReactNode
  close: () => void
  busy?: boolean
  returnFocusTo?: HTMLElement | null
  returnFocusFallback?: () => HTMLElement | null
}) {
  useI18n()

  const [opener] = useState<HTMLElement | null>(
    () =>
      returnFocusTo ??
      (typeof document === 'undefined' ? null : (document.activeElement as HTMLElement | null)),
  )
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) close()
      }}
    >
      <DialogContent
        className="admin-workspace admin-dialog"
        showCloseButton={!busy}
        aria-describedby={undefined}
        onEscapeKeyDown={(event) => {
          if (busy) event.preventDefault()
        }}
        onInteractOutside={(event) => {
          if (busy) event.preventDefault()
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          if (opener?.isConnected) opener.focus()
          else returnFocusFallback?.()?.focus()
        }}
      >
        <DialogHeader>
          <DialogTitle>
            <bdi dir="auto">{localized(title)}</bdi>
          </DialogTitle>
        </DialogHeader>
        {localized(children)}
        <DialogFooter>
          <Button type="button" variant="ghost" disabled={busy} onClick={close}>
            {t('admin:cancel')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
