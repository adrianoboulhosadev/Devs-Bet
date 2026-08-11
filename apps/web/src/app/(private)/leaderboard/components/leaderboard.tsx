'use client'

import { Loading } from '@/components/loading'
import { formatBRL } from '@/lib/money'
import { colorForId } from '@/lib/participant-colors'
import { useAuth } from '@/contexts/auth-context'
import { useLeaderboard } from '../hooks/use-leaderboard'

const POSITIONS = ['1ST', '2ND', '3RD']
const POSITION_COLORS = ['#ffb020', '#c9b8f0', '#ff6b35']

export function Leaderboard() {
  const { ranking, loading } = useLeaderboard()
  const { user } = useAuth()

  if (loading) return <Loading />

  return (
    <div className="animate-scrIn space-y-5">
      <div className="flex flex-wrap items-center gap-4">
        <p className="font-pixel text-base text-arcade-amber [text-shadow:0_0_16px_rgba(255,176,32,.5)]">
          ★ HIGH SCORES ★
        </p>
        <p className="font-arcade text-xl text-arcade-text-muted">
          lucro líquido em apostas encerradas
        </p>
      </div>

      {ranking.length === 0 ? (
        <p className="border-3 border-arcade-border bg-arcade-surface px-5 py-6 font-arcade text-lg text-arcade-text-muted">
          Ainda não há apostas liquidadas.
        </p>
      ) : (
        <div className="border-3 border-arcade-border bg-arcade-surface shadow-pixel-lg">
          <div className="flex items-center gap-4 border-b-3 border-arcade-border-strong px-5 py-3.5 font-pixel text-[8px] leading-relaxed tracking-widest text-arcade-text-muted">
            <span className="w-14 flex-none">POS</span>
            <span className="min-w-0 flex-1">APOSTADOR</span>
            <span>RESULTADO</span>
          </div>
          {ranking.map((entry, index) => {
            const isMe = user?.id === entry.bettorId
            const isProfit = entry.netProfit >= 0
            const initials = entry.bettorId.slice(0, 2).toUpperCase()

            return (
              <div
                key={entry.bettorId}
                className={`flex flex-wrap items-center gap-4 border-b border-arcade-border-strong px-5 py-4 ${isMe ? 'bg-[#1d1233]' : ''}`}
              >
                <span className="w-14 flex-none font-pixel text-sm" style={{ color: POSITION_COLORS[index] ?? '#8b7bb8' }}>
                  {POSITIONS[index] ?? `#${index + 1}`}
                </span>
                <span className="flex min-w-[190px] flex-1 items-center gap-3">
                  <span
                    className="grid h-[38px] w-[38px] flex-none place-items-center font-pixel text-[10px] text-arcade-bg shadow-pixel-sm"
                    style={{ backgroundColor: colorForId(entry.bettorId) }}
                  >
                    {initials}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-2xl leading-tight text-arcade-text">
                      Apostador {entry.bettorId.slice(0, 8)}
                      {isMe && <span className="ml-2 font-arcade text-base text-arcade-text-muted">(você)</span>}
                    </span>
                    <span className="block font-arcade text-lg text-arcade-text-muted">
                      {entry.betsWon}/{entry.betsSettled} apostas vencidas
                    </span>
                  </span>
                </span>
                <span className="ml-auto flex items-baseline gap-5">
                  <span className="text-xl text-arcade-text-soft">{formatBRL(entry.totalStaked)}</span>
                  <span className={`text-2xl ${isProfit ? 'text-arcade-lime' : 'text-arcade-danger'}`}>
                    {isProfit ? '+' : ''}
                    {formatBRL(entry.netProfit)}
                  </span>
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
