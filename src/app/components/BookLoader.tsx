import { localized, message as msg, useI18n } from '../../lib/i18n'
import { BookOpenText } from 'lucide-react'
import { cn } from '../../lib/utils'

export function BookLoadingIcon({ className }: { className?: string }) {
  useI18n()

  return (
    <BookOpenText
      aria-hidden="true"
      className={cn('book-loading-icon size-10 shrink-0 text-primary', className)}
      strokeWidth={1.4}
    />
  )
}

export function BookLoader({
  label = msg('common:loading'),
  compact = false,
  className,
}: {
  label?: string
  compact?: boolean
  className?: string
}) {
  useI18n()

  return (
    <div
      role="status"
      aria-label={localized(label)}
      className={cn(
        compact ? 'flex items-center gap-2' : 'flex flex-col items-center gap-3 py-8 text-center',
        'text-sm text-muted-foreground',
        className,
      )}
    >
      <BookLoadingIcon className={compact ? 'size-5' : undefined} />
      <span>{localized(label)}</span>
    </div>
  )
}
