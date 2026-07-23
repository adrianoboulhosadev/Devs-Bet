'use client'

import Link from 'next/link'
import { StatusBadge } from '@/components/status-badge'
import { Loading } from '@/components/loading'
import { formatBRL } from '@/lib/money'
import { useBets } from '../hooks/use-bets'

export function Bets() {
  const { bets, loading } = useBets()

  if (loading) return <Loading />

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Minhas apostas</h1>

      {bets.length === 0 ? (
        <p className="text-sm text-slate-500">Você ainda não apostou.</p>
      ) : (
        <ul className="space-y-2">
          {bets.map((bet) => (
            <li
              key={bet.id}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4"
            >
              <div className="text-sm">
                <p className="font-medium">{formatBRL(bet.stake)}</p>
                <Link href={`/matches/${bet.matchId}`} className="text-slate-500 underline">
                  ver partida
                </Link>
              </div>
              <div className="flex items-center gap-3 text-sm">
                {bet.status !== 'open' && <span>{formatBRL(bet.payout)}</span>}
                <StatusBadge status={bet.status} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
