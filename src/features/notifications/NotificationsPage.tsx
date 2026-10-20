import { useState } from 'react'
import { Bell } from 'lucide-react'
import { Empty, EmptyHeader, EmptyTitle, EmptyMedia } from '../../app/components/ui/empty'
import { t, useI18n } from '../../lib/i18n'
import { Button } from '../../app/components/ui/button'
import { PageContainer } from '../../app/components/PageContainer'
import { useNotifications } from './notification-context'
import { useNotificationFeed } from './use-notification-feed'
import { NotificationList } from './NotificationList'
import { NotificationFeedback } from './NotificationBell'

export function NotificationsPage() {
  useI18n()
  const { enabled, count, pending, markRead } = useNotifications()
  const [unread, setUnread] = useState(false)
  return (
    <PageContainer className="max-w-3xl py-10">
      <h1 className="font-serif text-3xl">{t('common:notificationTitle')}</h1>
      {!enabled ? (
        <p className="mt-4 notification-action">{t('common:notificationDisabled')}</p>
      ) : (
        <>
          <p className="my-4 text-sm text-muted-foreground">{t('common:notificationRetention')}</p>
          <div className="flex flex-wrap gap-2">
            <Button
              className="notification-action"
              variant={unread ? 'outline' : 'default'}
              aria-pressed={!unread}
              onClick={() => setUnread(false)}
            >
              {t('common:notificationAll')}
            </Button>
            <Button
              className="notification-action"
              variant={unread ? 'default' : 'outline'}
              aria-pressed={unread}
              onClick={() => setUnread(true)}
            >
              {t('common:notificationUnread')}
            </Button>
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
          </div>
          <NotificationFeedback />
          <InboxFeed key={String(unread)} unread={unread} />
        </>
      )}
    </PageContainer>
  )
}
function InboxFeed({ unread }: { unread: boolean }) {
  const feed = useNotificationFeed(20, unread)
  return (
    <>
      {feed.replaced && (
        <p role="status" className="my-3 text-sm text-muted-foreground">
          {t('common:notificationRefreshed')}
        </p>
      )}
      {feed.loading && !feed.nodes.length ? (
        <p role="status" className="py-6">
          {t('common:notificationLoading')}
        </p>
      ) : !feed.nodes.length && !feed.error ? (
        <Empty className="py-6">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Bell aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle className="text-sm font-normal">{t('common:notificationEmpty')}</EmptyTitle>
          </EmptyHeader>
        </Empty>
      ) : null}
      <NotificationList nodes={feed.nodes} />
      {feed.hasNextPage && (
        <Button
          className="notification-action"
          variant="outline"
          disabled={feed.loading}
          onClick={() => {
            void feed.loadMore()
          }}
        >
          {t('common:notificationMore')}
        </Button>
      )}
    </>
  )
}
