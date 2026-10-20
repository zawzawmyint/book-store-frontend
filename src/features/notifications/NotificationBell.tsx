import { useId, useState, type ReactNode } from 'react'
import { ArrowRight, Bell, CheckCheck } from 'lucide-react'
import { Popover } from 'radix-ui'
import { Link } from 'react-router-dom'
import { t, useI18n } from '../../lib/i18n'
import { IconAction } from '../../app/components/IconAction'
import { Button } from '../../app/components/ui/button'
import { Empty, EmptyHeader, EmptyTitle, EmptyMedia } from '../../app/components/ui/empty'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '../../app/components/ui/sheet'
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
function RecentFeed({ close, title }: { close: () => void; title: ReactNode }) {
  const feed = useNotificationFeed(10)
  const { scope, count, pending, markRead } = useNotifications()
  return (
    <>
      <div className="notification-inbox-header">
        {title}
        <Button
          className="notification-action notification-read-all"
          variant="ghost"
          disabled={pending || count === 0 || count === undefined}
          onClick={() => {
            void markRead()
          }}
        >
          <CheckCheck aria-hidden="true" className="size-4" />
          {t('common:notificationReadAll')}
        </Button>
      </div>
      <div className="notification-inbox-feed">
        <NotificationFeedback />
        {feed.loading && !feed.nodes.length ? (
          <p role="status" className="px-4 py-6 text-sm text-muted-foreground">
            {t('common:notificationLoading')}
          </p>
        ) : !feed.nodes.length && !feed.error ? (
          <Empty className="gap-2 px-4 py-6">
            <EmptyHeader>
              <EmptyMedia>
                <Bell aria-hidden="true" className="size-5" />
              </EmptyMedia>
              <EmptyTitle className="text-sm font-normal text-muted-foreground">
                {t('common:notificationEmpty')}
              </EmptyTitle>
            </EmptyHeader>
          </Empty>
        ) : null}
        <NotificationList nodes={feed.nodes} onNavigate={close} />
      </div>
      <div className="notification-inbox-footer">
        <Link
          className="notification-history-link"
          to={scope === 'STOREFRONT' ? '/account/notifications' : '/admin/notifications'}
          onClick={close}
        >
          {t('common:notificationViewAll')}
          <ArrowRight aria-hidden="true" className="size-4 rtl:rotate-180" />
        </Link>
      </div>
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
  const titleId = useId()
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
        showLanguageSwitcher={false}
        aria-describedby={undefined}
        className={`notification-inbox notification-inbox-sheet ${scope === 'WORKSPACE' ? 'admin-workspace' : ''}`}
      >
        {open && (
          <RecentFeed
            close={() => setOpen(false)}
            title={<SheetTitle>{t('common:notificationTitle')}</SheetTitle>}
          />
        )}
      </SheetContent>
    </Sheet>
  ) : (
    <Popover.Root open={open} onOpenChange={setOpen} modal={false}>
      <Popover.Trigger asChild>{trigger}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          collisionPadding={8}
          aria-labelledby={titleId}
          className={`notification-inbox notification-inbox-popover ${scope === 'WORKSPACE' ? 'admin-workspace' : ''}`}
        >
          {open && (
            <RecentFeed
              close={() => setOpen(false)}
              title={<h2 id={titleId}>{t('common:notificationTitle')}</h2>}
            />
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
