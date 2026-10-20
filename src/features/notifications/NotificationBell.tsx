import { useState } from 'react'
import { Bell } from 'lucide-react'
import { Link } from 'react-router-dom'
import { t, useI18n } from '../../lib/i18n'
import { IconAction } from '../../app/components/IconAction'
import { Button } from '../../app/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '../../app/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from '../../app/components/ui/sheet'
import { useIsMobile } from '../../app/hooks/use-mobile'
import { useNotifications } from './notification-context'
import { useNotificationFeed } from './use-notification-feed'
import { NotificationList } from './NotificationList'

export function NotificationFeedback() {
  const { error, refresh } = useNotifications()
  return error ? (
    <div role="alert" className="my-3 text-sm">
      <p>{t('common:notificationError')}</p>
      <Button
        className="notification-action"
        variant="outline"
        onClick={() => {
          void refresh()
        }}
      >
        {t('common:notificationRetry')}
      </Button>
    </div>
  ) : null
}
function RecentFeed({ close }: { close: () => void }) {
  const feed = useNotificationFeed(10)
  const { scope, count, pending, markRead } = useNotifications()
  return (
    <>
      <NotificationFeedback />
      <Button
        className="notification-action"
        variant="outline"
        disabled={pending || count === 0 || count === undefined}
        onClick={() => {
          void markRead()
        }}
      >
        {t('common:notificationReadAll')}
      </Button>
      {feed.loading && !feed.nodes.length ? (
        <p role="status" className="py-6">
          {t('common:notificationLoading')}
        </p>
      ) : !feed.nodes.length && !feed.error ? (
        <p className="py-6">{t('common:notificationEmpty')}</p>
      ) : null}
      <NotificationList nodes={feed.nodes} onNavigate={close} />
      <Button asChild className="mt-4 notification-action">
        <Link
          to={scope === 'STOREFRONT' ? '/account/notifications' : '/admin/notifications'}
          onClick={close}
        >
          {t('common:notificationViewAll')}
        </Link>
      </Button>
    </>
  )
}
export function NotificationBell() {
  const { enabled } = useNotifications()
  return enabled ? <EnabledBell /> : null
}
function EnabledBell() {
  useI18n()
  const { count, scope } = useNotifications()
  const [open, setOpen] = useState(false)
  const mobile = useIsMobile()
  const trigger = (
    <IconAction
      workspace={scope === 'WORKSPACE'}
      className="relative"
      label={
        count === undefined
          ? t('common:notificationCountUnknown')
          : t('common:notificationCount', { value0: count })
      }
    >
      <Bell aria-hidden="true" />
      {count !== undefined && count > 0 && (
        <span
          aria-hidden="true"
          className="absolute -end-1 top-0 rounded-full bg-primary px-1 text-[10px] leading-4 text-primary-foreground"
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
    </IconAction>
  )
  return mobile ? (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent
        side="bottom"
        className={`notification-inbox max-h-[90dvh] px-4 pb-6 ${scope === 'WORKSPACE' ? 'admin-workspace' : ''}`}
      >
        <SheetTitle>{t('common:notificationTitle')}</SheetTitle>
        <SheetDescription>{t('common:notificationRetention')}</SheetDescription>
        {open && <RecentFeed close={() => setOpen(false)} />}
      </SheetContent>
    </Sheet>
  ) : (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent
        className={`notification-inbox max-w-xl ${scope === 'WORKSPACE' ? 'admin-workspace' : ''}`}
      >
        <DialogTitle>{t('common:notificationTitle')}</DialogTitle>
        <DialogDescription className="mb-4">{t('common:notificationRetention')}</DialogDescription>
        {open && <RecentFeed close={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  )
}
