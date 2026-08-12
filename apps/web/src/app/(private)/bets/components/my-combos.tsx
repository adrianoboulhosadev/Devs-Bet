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
    <div className="border-3 border-arcade-border bg-arcade-surface shadow-pixel-lg">
      <h2 className="border-b-3 border-arcade-border-strong px-5 py-3 font-pixel text-[11px] tracking-wide text-arcade-text">
        APOSTAS MÚLTIPLAS
      </h2>

      {loading ? (
        <Loading compact />
      ) : combos.length === 0 ? (
        <p className="px-5 py-4 font-arcade text-lg text-arcade-text-muted">Nenhuma aposta múltipla ainda.</p>
      ) : (
        combos.map((combo) => (
          <div key={combo.id} className="space-y-2.5 border-b border-arcade-border-strong px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-2xl leading-tight text-arcade-text">
                {formatBRL(combo.stake)} · odd {combo.totalOdd}x
              </span>
              <div className="flex items-center gap-3">
                {combo.status !== 'open' && <span className="text-xl text-arcade-lime">{formatBRL(combo.payout)}</span>}
                <StatusBadge status={combo.status} />
                {canCancel(combo) && (
                  <Button variant="secondary" disabled={cancelling} onClick={() => setPendingCancelId(combo.id)}>
                    Cancelar
                  </Button>
                )}
              </div>
            </div>
            <ul className="space-y-1">
              {combo.legs.map((leg) => (
                <li
                  key={`${leg.marketId}-${leg.selectionId}`}
                  className="flex items-center justify-between gap-3 font-arcade text-lg text-arcade-text-muted"
                >
                  <span>
                    {marketLabel(leg.marketType, leg.marketId)} ·{' '}
                    {selectionLabel(leg.marketType, leg.marketId, leg.selectionId)} · odd {leg.odd}x
                  </span>
                  <StatusBadge status={leg.result === 'pending' ? 'open' : leg.result} />
                </li>
              ))}
            </ul>
          </div>
        ))
      )}

      <ConfirmDialog
        open={pendingCancelId !== null}
        title="Cancelar a aposta múltipla?"
        description="O valor volta para a sua carteira. Só dá pra cancelar enquanto NENHUMA das partidas da múltipla começou."
        confirmLabel="Cancelar múltipla"
        onConfirm={() => {
          if (pendingCancelId) cancelCombo(pendingCancelId)
          setPendingCancelId(null)
        }}
        onCancel={() => setPendingCancelId(null)}
      />
    </div>
  )
}
