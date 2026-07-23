'use client'

import Link from 'next/link'
import { useDashboard } from '../hooks/use-dashboard'

const CARDS = [
  { href: '/matches', title: 'Partidas', description: 'Veja o lobby, as odds ao vivo e aposte.' },
  { href: '/bets', title: 'Minhas apostas', description: 'Acompanhe suas apostas e resultados.' },
  { href: '/wallet', title: 'Carteira', description: 'Deposite via Pix, veja saldo e saque.' },
]

export function Dashboard() {
  const { user, isAdmin } = useDashboard()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Bem-vindo de volta</h1>
        <p className="text-sm text-slate-500">Logado como {user?.email}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {CARDS.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="rounded-lg border border-slate-200 p-5 transition-colors hover:border-slate-400"
          >
            <h2 className="font-medium">{card.title}</h2>
            <p className="mt-1 text-sm text-slate-500">{card.description}</p>
          </Link>
        ))}
        {isAdmin && (
          <Link
            href="/admin"
            className="rounded-lg border border-slate-200 p-5 transition-colors hover:border-slate-400"
          >
            <h2 className="font-medium">Admin</h2>
            <p className="mt-1 text-sm text-slate-500">Confirme depósitos/saques e gerencie partidas.</p>
          </Link>
        )}
      </div>
    </div>
  )
}
