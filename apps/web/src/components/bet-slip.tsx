'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/button'
import { formatBRL } from '@/lib/money'
import { useBetSlipPanel, type SlipMode } from '@/hooks/use-bet-slip-panel'

const MODES: Array<{ id: SlipMode; label: string }> = [
  { id: 'simples', label: 'Simples' },
  { id: 'multiplas', label: 'Múltiplas' },
]

/**
 * The bet slip: picks made anywhere in the app land here and are confirmed from
 * a single place, the way every sportsbook works — there is no bet form on the
 * match/tournament pages any more.
 *
 * Docked bottom-right and portaled into <body> so no page's layout (a
 * `space-y-*` parent, an `overflow-hidden` card) can push or clip it. Sits below
 * the ConfirmDialog's z-[95] so a confirmation always covers it.
 */
export function BetSlip() {
  const {
    selections,
    count,
    mode,
    setMode,
    singleStakes,
    setSingleStake,
    comboStake,
    setComboStake,
    totalOdd,
    canCombo,
    notCombinable,
    singlesTotalCents,
    comboStakeCents,
    remove,
    clear,
    confirm,
    placing,
    isSelfExcluded,
  } = useBetSlipPanel()

  const [open, setOpen] = useState(true)
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!mounted || count === 0) return null

  const potentialReturn =
    mode === 'multiplas' ? Math.round(comboStakeCents * totalOdd) : null

  return createPortal(
    <div className="fixed bottom-0 right-0 z-40 w-full max-w-sm p-2.5 sm:bottom-4 sm:right-4 sm:p-0">
      <div className="border-3 border-arcade-magenta bg-arcade-surface shadow-[0_0_34px_rgba(255,61,129,.28),8px_8px_0_#08040f]">
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
          className="flex w-full items-center justify-between gap-3 bg-arcade-magenta px-4 py-3.5 text-left text-arcade-bg"
        >
          <span className="flex items-center gap-2.5 font-pixel text-[11px] tracking-wide">
            <span className="grid h-6 min-w-6 place-items-center bg-arcade-bg px-1.5 text-[10px] text-arcade-magenta">
              {count}
            </span>
            APOSTA
          </span>
          <span className="flex items-center gap-3 font-pixel text-[11px]">
            {mode === 'multiplas' && canCombo && <span>{totalOdd}x</span>}
            <span aria-hidden>{open ? '▼' : '▲'}</span>
          </span>
        </button>

        {open && (
          <div className="max-h-[60vh] space-y-3.5 overflow-y-auto p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex gap-1 border-2 border-arcade-border p-1">
                {MODES.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => setMode(entry.id)}
                    disabled={entry.id === 'multiplas' && !canCombo}
                    className={`px-3 py-1.5 font-pixel text-[9px] tracking-wide transition-colors disabled:opacity-40 ${
                      mode === entry.id ? 'bg-arcade-magenta text-arcade-bg' : 'text-arcade-text-muted'
                    }`}
                  >
                    {entry.label}
                  </button>
                ))}
              </div>
              <button type="button" onClick={clear} className="font-arcade text-lg text-arcade-text-muted underline">
                limpar
              </button>
            </div>

            <ul className="divide-y divide-arcade-border-strong">
              {selections.map((selection) => (
                <li key={selection.marketId} className="space-y-2.5 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-xl leading-tight text-arcade-text">{selection.selectionLabel}</p>
                      <p className="truncate font-arcade text-base text-arcade-text-muted">{selection.marketLabel}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2.5">
                      {/* Simples: no odd applies at all (the pool decides at
                          settlement), so a selection nobody backed shows "—",
                          same as the match page. Múltiplas: the 2.00 fallback IS
                          what gets locked, so it has to be visible — otherwise
                          the combined odd in the header comes from nowhere. */}
                      <span className="text-xl text-arcade-lime">
                        {mode === 'multiplas'
                          ? `${selection.odd}x${selection.hasPool ? '' : '*'}`
                          : selection.hasPool
                            ? `${selection.odd}x`
                            : '—'}
                      </span>
                      <button
                        type="button"
                        onClick={() => remove(selection.marketId)}
                        aria-label={`Remover ${selection.selectionLabel}`}
                        className="font-arcade text-base text-arcade-danger underline"
                      >
                        tirar
                      </button>
                    </div>
                  </div>

                  {mode === 'simples' && (
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      inputMode="decimal"
                      placeholder="quanto vai de ficha? R$"
                      value={singleStakes[selection.marketId] ?? ''}
                      onChange={(event) => setSingleStake(selection.marketId, event.target.value)}
                      className="w-full border-2 border-arcade-border bg-[#0b0714] px-2.5 py-2 font-arcade text-lg text-arcade-amber outline-none focus:border-arcade-cyan"
                    />
                  )}
                </li>
              ))}
            </ul>

            {mode === 'multiplas' && (
              <div className="space-y-2.5">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  inputMode="decimal"
                  placeholder="valor da múltipla (R$)"
                  value={comboStake}
                  onChange={(event) => setComboStake(event.target.value)}
                  className="w-full border-2 border-arcade-border bg-[#0b0714] px-3 py-2 font-arcade text-lg text-arcade-amber outline-none focus:border-arcade-cyan"
                />
                <div className="flex items-center justify-between">
                  <span className="font-arcade text-lg text-arcade-text-muted">retorno estimado</span>
                  <span className="text-2xl text-arcade-lime">{formatBRL(potentialReturn ?? 0)}</span>
                </div>
                <p className="font-arcade text-base text-arcade-text-muted">
                  A odd combinada é travada na confirmação — até lá ela acompanha os pools.
                  {selections.some((selection) => !selection.hasPool) &&
                    ' (*) ainda sem apostas: entra a 2.00.'}
                </p>
              </div>
            )}

            {mode === 'simples' && (
              <>
                <div className="flex items-center justify-between">
                  <span className="font-arcade text-lg text-arcade-text-muted">Total apostado</span>
                  <span className="text-xl text-arcade-text">{formatBRL(singlesTotalCents)}</span>
                </div>
                <p className="font-arcade text-base text-arcade-text-muted">
                  Aposta simples é parimutuel: a odd acima é indicativa e o pagamento sai do pool
                  no encerramento.
                </p>
              </>
            )}

            {count >= 2 && notCombinable.length > 0 && (
              <p className="border-2 border-arcade-amber bg-[#0b0714] px-3 py-2 font-arcade text-base text-arcade-amber">
                {notCombinable.map((entry) => `"${entry.selectionLabel}"`).join(', ')} está com odd
                abaixo de 1.01 (detém todo o pool) e não pode entrar numa aposta múltipla — só como
                aposta simples.
              </p>
            )}

            {isSelfExcluded ? (
              <p className="border-2 border-arcade-border bg-[#0b0714] px-3 py-2 font-arcade text-lg text-arcade-text-muted">
                Apostas bloqueadas enquanto sua autoexclusão estiver ativa.
              </p>
            ) : (
              <Button variant="success" onClick={confirm} disabled={placing} className="w-full">
                {placing ? 'Confirmando…' : mode === 'simples' ? 'Apostar' : 'Confirmar múltipla'}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
