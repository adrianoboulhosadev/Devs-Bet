'use client'

import { useState } from 'react'
import Link from 'next/link'
import { StatusBadge } from '@/components/status-badge'
import { Loading } from '@/components/loading'
import { Button } from '@/components/button'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { formatBRL } from '@/lib/money'
import { useBets } from './hooks/use-bets'
import { MyCombos } from './components/my-combos'

export default function BetsPage() {
  const { bets, loading, stats, marketInfoOf, canCancel, cancelBet, cancelling } = useBets()
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

      <h2 className="pt-1 font-pixel text-[13px] tracking-wide text-arcade-text">APOSTAS SIMPLES</h2>

      {bets.length === 0 ? (
        <p className="border-3 border-arcade-border bg-arcade-surface px-5 py-6 font-arcade text-lg text-arcade-text-muted">
          Você ainda não apostou.
        </p>
      ) : (
        <ul className="space-y-2.5">
          {bets.map((bet) => {
            const info = marketInfoOf(bet)
            const marketHref = bet.marketType === 'tournament_outright' ? `/tournaments/${bet.marketId}` : `/matches/${bet.marketId}`
            return (
              <li key={bet.id} className="space-y-3 border-3 border-arcade-border bg-arcade-surface p-4 shadow-pixel">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xl leading-tight text-arcade-text">{info.participants}</p>
                    <p className="text-left font-arcade text-lg text-arcade-text-muted">{info.title}</p>
                  </div>
                  <StatusBadge status={bet.status} />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl leading-tight text-arcade-text">{formatBRL(bet.stake)}</span>
                    {bet.status !== 'open' && <span className="text-xl text-arcade-lime">{formatBRL(bet.payout)}</span>}
                  </div>
                  <div className="flex items-center gap-2.5">
                    {canCancel(bet) && (
                      <Button variant="secondary" disabled={cancelling} onClick={() => setPendingCancelId(bet.id)}>
                        Cancelar
                      </Button>
                    )}
                    <Link href={marketHref}>
                      <Button variant="secondary">Ver partida</Button>
                    </Link>
                  </div>
                </div>
              </li>
            )
          })}
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
