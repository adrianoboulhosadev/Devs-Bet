'use client'

import Link from 'next/link'
import { formatBRL } from '@/lib/money'
import { Button } from '../button'
import { NotificationBell } from '../notification-bell'
import { useHeader } from './hooks/use-header'

/** Top bar of the private area: screen marquee, inbox bell, balance and the shortcut to top up. */
export function Header() {
  const { kicker, title, available } = useHeader()

  return (
    <header className="sticky top-0 z-50 flex flex-none flex-wrap items-center gap-4 gap-y-3 border-b-3 border-arcade-border-strong bg-arcade-header px-4 py-4 sm:px-6">
      <div className="flex min-w-0 flex-1 flex-col gap-2" style={{ flexBasis: 240 }}>
        <span className="font-pixel text-[9px] leading-relaxed tracking-widest text-arcade-text-muted">{kicker}</span>
        <span className="font-pixel text-xs leading-relaxed text-arcade-lime sm:text-sm">{title}</span>
      </div>
      <NotificationBell />
      <div className="flex items-center gap-3 border-3 border-arcade-border bg-arcade-surface px-4 py-2">
        <span className="font-pixel text-[9px] tracking-wide text-arcade-text-muted">CRÉDITOS</span>
        <span className="text-2xl leading-none text-arcade-amber">{formatBRL(available)}</span>
      </div>
      <Link href="/wallet">
        <Button variant="success">+ Fichas</Button>
      </Link>
    </header>
  )
}
