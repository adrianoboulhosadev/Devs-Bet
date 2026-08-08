'use client'

import { Field } from '@/components/field'
import { Button } from '@/components/button'
import { StatusBadge } from '@/components/status-badge'
import { Loading } from '@/components/loading'
import { formatBRL } from '@/lib/money'
import { useSelfExclusion } from '@/hooks/use-self-exclusion'
import { useCombo } from '../hooks/use-combo'

export function Combo() {
  const {
    loading,
    pickableMarkets,
    pickedMarketKey,
    setPickedMarketKey,
    pickedMarket,
    pickedSelectionId,
    setPickedSelectionId,
    addLeg,
    legs,
    removeLeg,
    estimatedTotalOdd,
    stakeForm,
    onSubmit,
    placing,
    myCombos,
    combosLoading,
    marketLabel,
    selectionLabel,
  } = useCombo()
  const { isSelfExcluded } = useSelfExclusion()

  if (loading) return <Loading />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Bilhete múltiplo</h1>
        <p className="text-sm text-slate-500">
          Combine seleções de partidas e torneios diferentes — a odd de cada uma é travada na hora
          da confirmação e multiplicada (o mesmo cálculo das casas de apostas). Uma perna perdida
          derruba o bilhete inteiro.
        </p>
      </div>

      {isSelfExcluded && (
        <p className="rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-600">
          Apostas estão bloqueadas enquanto sua autoexclusão estiver ativa.
        </p>
      )}

      <div className={`space-y-3 rounded-lg border border-slate-200 bg-white p-5 ${isSelfExcluded ? 'opacity-50' : ''}`}>
        <h2 className="font-medium">Adicionar seleção</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1">
            <span className="text-sm font-medium">Partida ou torneio</span>
            <select
              className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
              value={pickedMarketKey}
              onChange={(event) => setPickedMarketKey(event.target.value)}
            >
              <option value="">Selecione…</option>
              {pickableMarkets.map((market) => (
                <option key={`${market.marketType}:${market.marketId}`} value={`${market.marketType}:${market.marketId}`}>
                  {market.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-medium">Seleção</span>
            <select
              className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-slate-500 disabled:bg-slate-50"
              value={pickedSelectionId}
              onChange={(event) => setPickedSelectionId(event.target.value)}
              disabled={!pickedMarket}
            >
              <option value="">Selecione…</option>
              {pickedMarket?.selections.map((selection) => (
                <option key={selection.id} value={selection.id}>
                  {selection.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={addLeg}
          disabled={isSelfExcluded || !pickedMarket || !pickedSelectionId}
        >
          Adicionar ao bilhete
        </Button>
      </div>

      <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="font-medium">
          Bilhete ({legs.length} {legs.length === 1 ? 'seleção' : 'seleções'})
        </h2>

        {legs.length === 0 ? (
          <p className="text-sm text-slate-500">Adicione pelo menos 2 seleções para montar o bilhete.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {legs.map((leg) => (
              <li key={leg.marketId} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <p className="font-medium">{leg.marketLabel}</p>
                  <p className="text-slate-500">{leg.selectionLabel}</p>
                </div>
                <button
                  type="button"
                  onClick={() => removeLeg(leg.marketId)}
                  className="text-sm text-red-600 underline"
                >
                  remover
                </button>
              </li>
            ))}
          </ul>
        )}

        {estimatedTotalOdd !== null && (
          <p className="text-sm text-slate-500">
            Odd combinada estimada: <span className="font-medium text-slate-900">{estimatedTotalOdd}x</span>{' '}
            (a odd final é travada só na confirmação)
          </p>
        )}

        <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
          <div className="w-40">
            <Field label="Valor (R$)" type="number" step="0.01" min="0" required {...stakeForm.register('amount')} />
          </div>
          <Button type="submit" disabled={isSelfExcluded || placing || legs.length < 2}>
            {placing ? 'Confirmando…' : 'Confirmar bilhete'}
          </Button>
        </form>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white">
        <h2 className="border-b border-slate-100 px-5 py-3 font-medium">Meus bilhetes</h2>
        {combosLoading ? (
          <div className="p-5">
            <Loading />
          </div>
        ) : myCombos.length === 0 ? (
          <p className="px-5 py-4 text-sm text-slate-500">Nenhum bilhete ainda.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {myCombos.map((combo) => (
              <li key={combo.id} className="space-y-2 px-5 py-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {formatBRL(combo.stake)} · odd {combo.totalOdd}x
                  </span>
                  <div className="flex items-center gap-3">
                    {combo.status !== 'open' && <span>{formatBRL(combo.payout)}</span>}
                    <StatusBadge status={combo.status} />
                  </div>
                </div>
                <ul className="space-y-1 text-slate-500">
                  {combo.legs.map((leg) => (
                    <li key={`${leg.marketId}-${leg.selectionId}`} className="flex items-center justify-between">
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
      </div>
    </div>
  )
}
