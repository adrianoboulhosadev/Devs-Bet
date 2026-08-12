'use client'

import { useState } from 'react'
import Link from 'next/link'
import { StatusBadge } from '@/components/status-badge'
import { Loading } from '@/components/loading'
import { Button } from '@/components/button'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { formatBRL } from '@/lib/money'
import { useBets } from '../hooks/use-bets'
import { StakeLimit } from './stake-limit'
import { MyCombos } from './my-combos'

export function Bets() {
  const { bets, loading, stats, canCancel, cancelBet, cancelling } = useBets()
  const [pendingCancelId, setPendingCancelId] = useState<string | null>(null)

  if (loading) return <Loading />

  return (
    <div className="animate-scrIn space-y-5">
      <div className="grid gap-3.5 [grid-template-columns:repeat(auto-fit,minmax(min(220px,100%),1fr))]">
        <div className="border-3 border-arcade-border bg-arcade-surface px-5 py-4 shadow-pixel">
          <p className="font-pixel text-[9px] tracking-widest text-arcade-text-muted">APOSTAS ABERTAS</p>
          <p className="text-4xl leading-tight text-arcade-cyan">{stats.openCount}</p>
        </div>
        <div className="border-3 border-arcade-border bg-arcade-surface px-5 py-4 shadow-pixel">
          <p className="font-pixel text-[9px] tracking-widest text-arcade-text-muted">APOSTADO EM ABERTO</p>
          <p className="text-4xl leading-tight text-arcade-lime">{formatBRL(stats.openStaked)}</p>
        </div>
        <div className="border-3 border-arcade-border bg-arcade-surface px-5 py-4 shadow-pixel">
          <p className="font-pixel text-[9px] tracking-widest text-arcade-text-muted">APROVEITAMENTO</p>
          <p className="text-4xl leading-tight text-arcade-amber">{stats.winRate === null ? '—' : `${stats.winRate}%`}</p>
        </div>
      </div>

      <StakeLimit />

      <h2 className="pt-1 font-pixel text-[13px] tracking-wide text-arcade-text">APOSTAS SIMPLES</h2>

      {bets.length === 0 ? (
        <p className="border-3 border-arcade-border bg-arcade-surface px-5 py-6 font-arcade text-lg text-arcade-text-muted">
          Você ainda não apostou.
        </p>
      ) : (
        <ul className="space-y-2.5">
          {bets.map((bet) => (
            <li
              key={bet.id}
              className="flex flex-wrap items-center justify-between gap-3 border-3 border-arcade-border bg-arcade-surface p-4 shadow-pixel"
            >
              <div>
                <p className="text-2xl leading-tight text-arcade-text">{formatBRL(bet.stake)}</p>
                {bet.marketType === 'tournament_outright' ? (
                  <Link href={`/tournaments/${bet.marketId}`} className="font-arcade text-lg text-arcade-text-muted underline">
                    ver torneio (campeão)
                  </Link>
                ) : (
                  <Link href={`/matches/${bet.marketId}`} className="font-arcade text-lg text-arcade-text-muted underline">
                    ver partida
                  </Link>
                )}
              </div>
              <div className="flex items-center gap-3">
                {bet.status !== 'open' && <span className="text-xl text-arcade-lime">{formatBRL(bet.payout)}</span>}
                <StatusBadge status={bet.status} />
                {canCancel(bet) && (
                  <Button variant="secondary" disabled={cancelling} onClick={() => setPendingCancelId(bet.id)}>
                    Cancelar
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <MyCombos />

      <ConfirmDialog
        open={pendingCancelId !== null}
        title="Cancelar a aposta?"
        description="O valor volta para a sua carteira. Só dá pra cancelar enquanto a partida não começou."
        confirmLabel="Cancelar aposta"
        onConfirm={() => {
          if (pendingCancelId) cancelBet(pendingCancelId)
          setPendingCancelId(null)
        }}
        onCancel={() => setPendingCancelId(null)}
      />
    </div>
  )
}
