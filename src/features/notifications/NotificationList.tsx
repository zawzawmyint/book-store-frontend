import { notificationMessage } from './notification-message'
import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import { Bell, Check, CircleAlert, CircleCheck, Package, RotateCcw, Truck } from 'lucide-react'
import type { NotificationFieldsFragment } from '../../generated/graphql'
import { locale, t, useI18n, type TranslationKey } from '../../lib/i18n'
import { Button } from '../../app/components/ui/button'
import {
  Item,
  ItemContent,
  ItemTitle,
  ItemDescription,
  ItemMedia,
  ItemActions,
} from '../../app/components/ui/item'
import { useNotifications } from './notification-context'
import { notificationLink } from './notification-links'

const eventIcons = {
  PAYMENT_CONFIRMED: CircleCheck,
  ORDER_ACCEPTED: Package,
  ORDER_SHIPPED: Truck,
  ORDER_DELIVERED: CircleCheck,
  ORDER_CANCELLED: CircleAlert,
  REFUND_COMPLETED: RotateCcw,
  NEW_PAID_ORDER: Package,
  STOCK_LOW: CircleAlert,
  STOCK_OUT: CircleAlert,
  REFUND_FAILED: CircleAlert,
}

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
    <ul className="notification-list">
      {nodes.map((item) => {
        const link = notificationLink(item)
        const message = notificationMessage(item)
        const EventIcon = eventIcons[item.kind] ?? Bell
        const content = (
          <>
            <ItemMedia>
              <EventIcon aria-hidden="true" className="notification-event-icon" />
            </ItemMedia>
            <ItemContent className="notification-row-copy">
              <ItemTitle
                className={`notification-row-message ${!item.readAt ? 'font-semibold' : 'font-normal'}`}
              >
                <bdi dir="auto">{message}</bdi>
                {!item.readAt && (
                  <span className="notification-unread-dot">
                    <span className="sr-only">{t('common:notificationUnread')}</span>
                  </span>
                )}
              </ItemTitle>
              {item.kind === 'ORDER_CANCELLED' &&
                item.refundPhase &&
                ['NONE', 'PROCESSING', 'SUPPORT', 'COMPLETED'].includes(item.refundPhase) && (
                  <ItemDescription className="notification-row-detail text-foreground">
                    {t(`common:notificationRefund_${item.refundPhase}` as TranslationKey)}
                  </ItemDescription>
                )}
              <span className="notification-row-meta">
                {item.testPayment && <span>{t('common:notificationTest')}</span>}
                <time dateTime={item.createdAt}>
                  {new Date(item.createdAt).toLocaleString(locale(), {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </time>
              </span>
            </ItemContent>
          </>
        )
        return (
          <Item asChild key={item.id} className="gap-0 rounded-none p-0">
            <li className="notification-row" data-unread={!item.readAt || undefined}>
              {link ? (
                <Link
                  className="notification-row-link"
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
                  {content}
                </Link>
              ) : (
                <div className="notification-row-link">{content}</div>
              )}
              {!item.readAt && (
                <ItemActions>
                  <Button
                    className="notification-action notification-read-one"
                    variant="ghost"
                    aria-label={`${t('common:notificationRead')}: ${message}`}
                    title={t('common:notificationRead')}
                    disabled={pending}
                    onClick={() => {
                      void markRead(item.id)
                    }}
                  >
                    <Check aria-hidden="true" className="size-4" />
                  </Button>
                </ItemActions>
              )}
            </li>
          </Item>
        )
      })}
    </ul>
  )
}
