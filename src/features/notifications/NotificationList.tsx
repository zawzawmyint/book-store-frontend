import { notificationMessage } from './notification-message'
import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import type { NotificationFieldsFragment } from '../../generated/graphql'
import { locale, t, useI18n, type TranslationKey } from '../../lib/i18n'
import { Button } from '../../app/components/ui/button'
import { useNotifications } from './notification-context'
import { notificationLink } from './notification-links'

export function NotificationList({
  nodes,
  onNavigate,
}: {
  nodes: NotificationFieldsFragment[]
  onNavigate?: () => void
}) {
  useI18n()
  const { markRead, pending } = useNotifications()
  const navigate = useNavigate()
  const active = useRef(true)
  useEffect(() => {
    active.current = true
    return () => {
      active.current = false
    }
  }, [])
  return (
    <ul className="divide-y divide-border">
      {nodes.map((item) => {
        const link = notificationLink(item)
        return (
          <li
            key={item.id}
            className={`space-y-2 py-4 ${!item.readAt ? 'border-s-2 border-primary ps-3' : 'ps-3'}`}
          >
            <p className={!item.readAt ? 'font-semibold break-words' : 'break-words'}>
              <bdi dir="auto">{notificationMessage(item)}</bdi>
            </p>
            {item.kind === 'ORDER_CANCELLED' &&
              item.refundPhase &&
              ['NONE', 'PROCESSING', 'SUPPORT', 'COMPLETED'].includes(item.refundPhase) && (
                <p className="text-sm">
                  {t(`common:notificationRefund_${item.refundPhase}` as TranslationKey)}
                </p>
              )}
            {item.testPayment && (
              <p className="text-xs text-muted-foreground">{t('common:notificationTest')}</p>
            )}
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <time dateTime={item.createdAt}>
                {new Date(item.createdAt).toLocaleString(locale(), {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </time>
              {!item.readAt && <span>{t('common:notificationUnread')}</span>}
            </div>
            <div className="flex flex-wrap gap-2">
              {link && (
                <Button className="notification-action" asChild variant="outline">
                  <Link
                    to={link}
                    onClick={(event) => {
                      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
                      event.preventDefault()
                      void (async () => {
                        if (!item.readAt) await markRead(item.id)
                        if (active.current) {
                          navigate(link)
                          onNavigate?.()
                        }
                      })()
                    }}
                  >
                    {t('common:notificationView')}
                  </Link>
                </Button>
              )}
              {!item.readAt && (
                <Button
                  className="notification-action"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => {
                    void markRead(item.id)
                  }}
                >
                  {t('common:notificationRead')}
                </Button>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
