'use client'

import Link from 'next/link'
import { formatRelativeTime } from '@/lib/date'
import { accentFor } from '@/lib/notifications'
import { useNotificationBell } from './hooks/use-notification-bell'

// Past this the badge stops being a number and starts being "a lot".
const BADGE_CAP = 99

// Same pixel-art language as the sidebar icons: a 16x16 grid of rects.
const BellIcon = () => (
  <svg viewBox="0 0 16 16" width={22} height={22} fill="currentColor" className="shrink-0">
    <rect x="7" y="1" width="2" height="2" />
    <rect x="5" y="3" width="6" height="1" />
    <rect x="4" y="4" width="8" height="6" />
    <rect x="3" y="10" width="10" height="2" />
    <rect x="6" y="13" width="4" height="2" />
  </svg>
)

export function NotificationBell() {
  const { containerRef, open, toggle, close, items, unreadCount, openNotification } = useNotificationBell()

  return (
    // `relative` só a partir de `lg`. Abaixo disso o wrapper é estático de
    // propósito: assim o painel se posiciona contra o HEADER (que é `sticky`, e
    // portanto o bloco de contenção mais próximo) e consegue ocupar a largura da
    // tela. Preso ao sininho, o `right-0` do desktop jogava um painel de 340px
    // pra ESQUERDA do botão — e no celular o sininho fica na borda esquerda, então
    // o painel saía da tela e era cortado pelo `overflow-x-hidden` do layout.
    <div ref={containerRef} className="lg:relative">
      <button
        type="button"
        onClick={toggle}
        aria-label={unreadCount > 0 ? `Notificações (${unreadCount} não lidas)` : 'Notificações'}
        aria-expanded={open}
        className={`relative grid h-[46px] w-[46px] place-items-center border-3 transition-colors ${
          open
            ? 'border-arcade-magenta bg-arcade-surface text-arcade-magenta'
            : 'border-arcade-border bg-arcade-surface text-arcade-text-soft hover:border-arcade-cyan hover:text-arcade-cyan'
        }`}
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className="absolute -right-2 -top-2 grid h-5 min-w-[20px] place-items-center bg-arcade-magenta px-1 font-pixel text-[8px] text-arcade-bg shadow-pixel-sm">
            {unreadCount > BADGE_CAP ? `${BADGE_CAP}+` : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute inset-x-4 top-[calc(100%+10px)] z-[70] border-3 border-arcade-border bg-arcade-surface shadow-pixel-lg lg:inset-x-auto lg:right-0 lg:w-[340px]">
          <div className="flex items-center justify-between border-b-3 border-arcade-border-strong px-4 py-3">
            <span className="font-pixel text-[9px] tracking-widest text-arcade-text-muted">
              NOTIFICAÇÕES
            </span>
            {unreadCount > 0 && (
              <span className="font-arcade text-base text-arcade-magenta">
                {unreadCount} não {unreadCount === 1 ? 'lida' : 'lidas'}
              </span>
            )}
          </div>

          {items.length === 0 ? (
            <p className="px-4 py-6 text-center font-arcade text-lg text-arcade-text-muted">
              Nada por aqui ainda.
            </p>
          ) : (
            <ul className="max-h-[320px] overflow-y-auto">
              {items.map((notification) => (
                <li key={notification.id}>
                  <button
                    type="button"
                    onClick={() => openNotification(notification)}
                    className={`flex w-full gap-3 border-b border-arcade-border-strong px-4 py-3 text-left transition-colors hover:bg-[#1d1233] ${
                      notification.read ? '' : 'bg-[#1a1030]'
                    }`}
                  >
                    <span
                      className="mt-1.5 h-2.5 w-2.5 flex-none"
                      style={{
                        backgroundColor: accentFor(notification.type),
                        // A read line keeps its color, dimmed — the dot is what
                        // says "new", the hue says what kind of news it is.
                        opacity: notification.read ? 0.35 : 1,
                      }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span
                          className={`text-xl leading-tight ${notification.read ? 'text-arcade-text-soft' : 'text-arcade-text'}`}
                        >
                          {notification.title}
                        </span>
                        <span className="flex-none font-arcade text-sm text-arcade-text-muted">
                          {formatRelativeTime(notification.createdAt)}
                        </span>
                      </span>
                      <span className="mt-0.5 block font-arcade text-base leading-snug text-arcade-text-muted">
                        {notification.body}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <Link
            href="/notifications"
            onClick={close}
            className="block border-t-3 border-arcade-border-strong px-4 py-3 text-center font-pixel text-[9px] tracking-widest text-arcade-cyan hover:bg-[#1d1233]"
          >
            VER TODAS
          </Link>
        </div>
      )}
    </div>
  )
}
