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
 * the ConfirmDialog's z-50 so a confirmation always covers it.
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
    <div className="fixed bottom-0 right-0 z-40 w-full max-w-sm p-4 sm:bottom-4 sm:right-4 sm:p-0">
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
          className="flex w-full items-center justify-between gap-3 bg-slate-900 px-4 py-3 text-left text-white"
        >
          <span className="flex items-center gap-2 text-sm font-medium">
            <span className="grid h-6 min-w-6 place-items-center rounded-full bg-white px-1.5 text-xs font-semibold text-slate-900">
              {count}
            </span>
            Bilhete
          </span>
          <span className="flex items-center gap-3 text-sm">
            {mode === 'multiplas' && canCombo && <span className="font-semibold">{totalOdd}x</span>}
            <span aria-hidden className="text-xs">
              {open ? '▼' : '▲'}
            </span>
          </span>
        </button>

        {open && (
          <div className="max-h-[60vh] space-y-3 overflow-y-auto p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex rounded-md bg-slate-100 p-0.5">
                {MODES.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => setMode(entry.id)}
                    disabled={entry.id === 'multiplas' && !canCombo}
                    className={`rounded px-3 py-1 text-sm font-medium transition-colors disabled:opacity-40 ${
                      mode === entry.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                    }`}
                  >
                    {entry.label}
                  </button>
                ))}
              </div>
              <button type="button" onClick={clear} className="text-sm text-slate-500 underline">
                limpar
              </button>
            </div>

            <ul className="divide-y divide-slate-100">
              {selections.map((selection) => (
                <li key={selection.marketId} className="space-y-2 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 text-sm">
                      <p className="truncate font-medium">{selection.selectionLabel}</p>
                      <p className="truncate text-xs text-slate-500">{selection.marketLabel}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {/* Simples: no odd applies at all (the pool decides at
                          settlement), so a selection nobody backed shows "—",
                          same as the match page. Múltiplas: the 2.00 fallback IS
                          what gets locked, so it has to be visible — otherwise
                          the combined odd in the header comes from nowhere. */}
                      <span className="text-sm font-semibold">
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
                        className="text-sm text-red-600 underline"
                      >
                        remover
                      </button>
                    </div>
                  </div>

                  {mode === 'simples' && (
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      inputMode="decimal"
                      placeholder="Valor (R$)"
                      value={singleStakes[selection.marketId] ?? ''}
                      onChange={(event) => setSingleStake(selection.marketId, event.target.value)}
                      className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-slate-500"
                    />
                  )}
                </li>
              ))}
            </ul>

            {mode === 'multiplas' && (
              <div className="space-y-2">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  inputMode="decimal"
                  placeholder="Valor do bilhete (R$)"
                  value={comboStake}
                  onChange={(event) => setComboStake(event.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Retorno possível</span>
                  <span className="font-semibold">{formatBRL(potentialReturn ?? 0)}</span>
                </div>
                <p className="text-xs text-slate-500">
                  A odd combinada é travada na confirmação — até lá ela acompanha os pools.
                  {selections.some((selection) => !selection.hasPool) &&
                    ' (*) ainda sem apostas: entra a 2.00.'}
                </p>
              </div>
            )}

            {mode === 'simples' && (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Total apostado</span>
                  <span className="font-semibold">{formatBRL(singlesTotalCents)}</span>
                </div>
                <p className="text-xs text-slate-500">
                  Aposta simples é parimutuel: a odd acima é indicativa e o pagamento sai do pool
                  no encerramento.
                </p>
              </>
            )}

            {count >= 2 && notCombinable.length > 0 && (
              <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
                {notCombinable.map((entry) => `"${entry.selectionLabel}"`).join(', ')} está com odd
                abaixo de 1.01 (detém todo o pool) e não pode entrar num bilhete múltiplo — só como
                aposta simples.
              </p>
            )}

            {isSelfExcluded ? (
              <p className="rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-600">
                Apostas bloqueadas enquanto sua autoexclusão estiver ativa.
              </p>
            ) : (
              <Button onClick={confirm} disabled={placing} className="w-full">
                {placing ? 'Confirmando…' : mode === 'simples' ? 'Apostar' : 'Confirmar bilhete'}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
