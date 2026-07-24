'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { Button } from './button'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Início' },
  { href: '/matches', label: 'Partidas' },
  { href: '/bets', label: 'Minhas apostas' },
  { href: '/wallet', label: 'Carteira' },
]

/** Chrome of the private area: top navigation + sign out, wrapping every private page. */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const { user, isAdmin, logout } = useAuth()

  const items = isAdmin
    ? [...NAV_ITEMS, { href: '/categories', label: 'Categorias' }, { href: '/admin', label: 'Admin' }]
    : NAV_ITEMS

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-6 px-6">
          <Link href="/dashboard" className="text-lg font-semibold">
            Devs-Bet
          </Link>

          <nav className="flex items-center gap-1">
            {items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    active ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            {user && <span className="hidden text-sm text-slate-500 sm:inline">{user.email}</span>}
            <Button variant="secondary" onClick={() => logout()}>
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  )
}
