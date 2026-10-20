import { localized, t, useI18n } from '../../../lib/i18n'
import { CircleCheck, Clock } from 'lucide-react'
import { Badge } from '../../../app/components/ui/badge'

export function EmailVerificationBadge({ verified }: { verified: boolean }) {
  useI18n()

  const Icon = verified ? CircleCheck : Clock
  return (
    <Badge
      variant="outline"
      className={`gap-1 whitespace-nowrap ${verified ? 'border-success/40 bg-success/10 text-success' : 'border-amber-700/40 bg-amber-700/10 text-amber-800 dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-300'}`}
    >
      <Icon aria-hidden="true" className="size-3.5" />
      {localized(verified ? t('admin:verified') : t('admin:unverified'))}
    </Badge>
  )
}
