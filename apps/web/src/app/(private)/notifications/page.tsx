'use client'

import { useRouter } from 'next/navigation'
import type { NotificationDTO } from '@notification/adapters'
import { Button } from '@/components/button'
import { Loading } from '@/components/loading'
import { formatDateTime, formatRelativeTime } from '@/lib/date'
import { accentFor } from '@/lib/notifications'
import { useNotificationsInbox } from './hooks/use-notifications-inbox'
import { FILTERS } from './data/inbox-filters'

export default function NotificationsPage() {
  const router = useRouter()
  const {
    visible,
    unreadCount,
    total,
    loading,
    filter,
    setFilter,
    markAsRead,
    markAllAsRead,
    markingAll,
  } = useNotificationsInbox()

  if (loading) return <Loading />

  const open = (notification: NotificationDTO) => {
    if (!notification.read) markAsRead(notification.id)
    if (notification.link) router.push(notification.link)
  }

  return (
    <div className="animate-scrIn space-y-5">
      <div className="flex flex-wrap items-center gap-4">
        <p className="font-pixel text-base text-arcade-cyan [text-shadow:0_0_16px_rgba(34,230,255,.5)]">
          ✉ CAIXA DE ENTRADA
        </p>
        <p className="font-arcade text-xl text-arcade-text-muted">
          {unreadCount > 0
            ? `${unreadCount} não ${unreadCount === 1 ? 'lida' : 'lidas'} de ${total}`
            : 'tudo em dia'}
        </p>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {FILTERS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setFilter(option.value)}
              className={`border-3 px-3.5 py-2 font-pixel text-[9px] tracking-wide transition-colors ${
                filter === option.value
                  ? 'border-arcade-cyan text-arcade-cyan'
                  : 'border-arcade-border text-arcade-text-muted hover:text-arcade-text-soft'
              }`}
            >
              {option.label.toUpperCase()}
            </button>
          ))}
          <Button
            variant="secondary"
            disabled={unreadCount === 0 || markingAll}
            onClick={() => markAllAsRead()}
          >
            Marcar todas
          </Button>
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="border-3 border-arcade-border bg-arcade-surface px-5 py-6 font-arcade text-lg text-arcade-text-muted">
          {filter === 'unread'
            ? 'Nenhuma notificação não lida.'
            : 'Nada por aqui ainda. Aposte, deposite — o que acontecer aparece nesta tela.'}
        </p>
      ) : (
        <div className="border-3 border-arcade-border bg-arcade-surface shadow-pixel-lg">
          {visible.map((notification) => (
            <button
              key={notification.id}
              type="button"
              onClick={() => open(notification)}
              className={`flex w-full items-start gap-4 border-b border-arcade-border-strong px-5 py-4 text-left transition-colors last:border-b-0 hover:bg-[#1d1233] ${
                notification.read ? '' : 'bg-[#1a1030]'
              }`}
            >
              <span
                className="mt-2 h-3 w-3 flex-none"
                style={{
                  backgroundColor: accentFor(notification.type),
                  opacity: notification.read ? 0.35 : 1,
                }}
              />
              <span className="min-w-0 flex-1">
                <span
                  className={`block text-2xl leading-tight ${notification.read ? 'text-arcade-text-soft' : 'text-arcade-text'}`}
                >
                  {notification.title}
                  {!notification.read && (
                    <span className="ml-3 align-middle font-pixel text-[8px] tracking-widest text-arcade-magenta">
                      NOVA
                    </span>
                  )}
                </span>
                <span className="mt-1 block font-arcade text-lg leading-snug text-arcade-text-muted">
                  {notification.body}
                </span>
              </span>
              <span
                className="flex-none font-arcade text-base text-arcade-text-muted"
                title={formatDateTime(notification.createdAt)}
              >
                {formatRelativeTime(notification.createdAt)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
