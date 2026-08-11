'use client'

import { useState } from 'react'
import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/button'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Loading } from '@/components/loading'
import { formatBRL } from '@/lib/money'
import { useMyCombos } from '../hooks/use-my-combos'

/** History of the user's combo tickets (fixed odds), next to the simple bets —
 * both are placed from the bet slip, so both are read from the same screen. */
export function MyCombos() {
  const { combos, loading, marketLabel, selectionLabel, canCancel, cancelCombo, cancelling } =
    useMyCombos()
  const [pendingCancelId, setPendingCancelId] = useState<string | null>(null)

  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <h2 className="border-b border-slate-100 px-5 py-3 font-medium">Meus bilhetes múltiplos</h2>

      {loading ? (
        <div className="p-5">
          <Loading />
        </div>
      ) : combos.length === 0 ? (
        <p className="px-5 py-4 text-sm text-slate-500">Nenhum bilhete ainda.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {combos.map((combo) => (
            <li key={combo.id} className="space-y-2 px-5 py-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium">
                  {formatBRL(combo.stake)} · odd {combo.totalOdd}x
                </span>
                <div className="flex items-center gap-3">
                  {combo.status !== 'open' && <span>{formatBRL(combo.payout)}</span>}
                  <StatusBadge status={combo.status} />
                  {canCancel(combo) && (
                    <Button
                      variant="secondary"
                      disabled={cancelling}
                      onClick={() => setPendingCancelId(combo.id)}
                    >
                      Cancelar
                    </Button>
                  )}
                </div>
              </div>
              <ul className="space-y-1 text-slate-500">
                {combo.legs.map((leg) => (
                  <li
                    key={`${leg.marketId}-${leg.selectionId}`}
                    className="flex items-center justify-between gap-3"
                  >
                    <span>
                      {marketLabel(leg.marketType, leg.marketId)} ·{' '}
                      {selectionLabel(leg.marketType, leg.marketId, leg.selectionId)} · odd {leg.odd}x
                    </span>
                    <StatusBadge status={leg.result === 'pending' ? 'open' : leg.result} />
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={pendingCancelId !== null}
        title="Cancelar o bilhete?"
        description="O valor volta para a sua carteira. Só dá pra cancelar enquanto NENHUMA das partidas do bilhete começou."
        confirmLabel="Cancelar bilhete"
        onConfirm={() => {
          if (pendingCancelId) cancelCombo(pendingCancelId)
          setPendingCancelId(null)
        }}
        onCancel={() => setPendingCancelId(null)}
      />
    </div>
  )
}
