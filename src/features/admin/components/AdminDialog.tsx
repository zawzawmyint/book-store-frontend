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
}: {
  title: string
  children: React.ReactNode
  close: () => void
  busy?: boolean
  returnFocusTo?: HTMLElement | null
}) {
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
          opener?.focus()
        }}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {children}
        <DialogFooter>
          <Button type="button" variant="ghost" disabled={busy} onClick={close}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
