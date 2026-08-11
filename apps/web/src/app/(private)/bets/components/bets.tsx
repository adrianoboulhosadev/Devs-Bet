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
  const { bets, loading, canCancel, cancelBet, cancelling } = useBets()
  const [pendingCancelId, setPendingCancelId] = useState<string | null>(null)

  if (loading) return <Loading />

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Minhas apostas</h1>

      <StakeLimit />

      <h2 className="pt-2 font-medium">Apostas simples</h2>

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
                {bet.marketType === 'tournament_outright' ? (
                  <Link href={`/tournaments/${bet.marketId}`} className="text-slate-500 underline">
                    ver torneio (campeão)
                  </Link>
                ) : (
                  <Link href={`/matches/${bet.marketId}`} className="text-slate-500 underline">
                    ver partida
                  </Link>
                )}
              </div>
              <div className="flex items-center gap-3 text-sm">
                {bet.status !== 'open' && <span>{formatBRL(bet.payout)}</span>}
                <StatusBadge status={bet.status} />
                {canCancel(bet) && (
                  <Button
                    variant="secondary"
                    disabled={cancelling}
                    onClick={() => setPendingCancelId(bet.id)}
                  >
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
