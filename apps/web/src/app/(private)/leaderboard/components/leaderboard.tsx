'use client'

import { Loading } from '@/components/loading'
import { formatBRL } from '@/lib/money'
import { useAuth } from '@/contexts/auth-context'
import { useLeaderboard } from '../hooks/use-leaderboard'

const MEDALS = ['🥇', '🥈', '🥉']

export function Leaderboard() {
  const { ranking, loading } = useLeaderboard()
  const { user } = useAuth()

  if (loading) return <Loading />

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Ranking de apostadores</h1>
      <p className="text-sm text-slate-500">
        Os maiores lucros líquidos entre apostas já liquidadas (vencidas/perdidas).
      </p>

      {ranking.length === 0 ? (
        <p className="text-sm text-slate-500">Ainda não há apostas liquidadas.</p>
      ) : (
        <ul className="space-y-2">
          {ranking.map((entry, index) => {
            const isMe = user?.id === entry.bettorId
            const isProfit = entry.netProfit >= 0

            return (
              <li
                key={entry.bettorId}
                className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4 ${
                  isMe ? 'border-slate-900 bg-slate-50' : 'border-slate-200 bg-white'
                }`}
              >
                <div className="flex items-center gap-3 text-sm">
                  <span className="w-8 text-lg">{MEDALS[index] ?? `#${index + 1}`}</span>
                  <div>
                    <p className="font-medium">
                      Apostador {entry.bettorId.slice(0, 8)}
                      {isMe && <span className="ml-2 text-xs text-slate-500">(você)</span>}
                    </p>
                    <p className="text-slate-500">
                      {entry.betsWon}/{entry.betsSettled} apostas vencidas
                    </p>
                  </div>
                </div>
                <div className="text-right text-sm">
                  <p className={`font-semibold ${isProfit ? 'text-emerald-600' : 'text-red-600'}`}>
                    {isProfit ? '+' : ''}
                    {formatBRL(entry.netProfit)}
                  </p>
                  <p className="text-slate-500">{formatBRL(entry.totalStaked)} apostados</p>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
