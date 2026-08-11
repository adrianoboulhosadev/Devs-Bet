'use client'

import { useState } from 'react'
import { useMutation, useQueries, useQueryClient } from '@tanstack/react-query'
import type { MarketOddsDTO } from '@betting/adapters'
import { api } from '@/lib/api'
import { notify } from '@/lib/notify'
import { toCents } from '@/lib/money'
import { useBetSlip, type SlipSelection } from '@/contexts/bet-slip-context'
import { useSelfExclusion } from '@/hooks/use-self-exclusion'

export type SlipMode = 'simples' | 'multiplas'

// Same neutral "evens" the backend falls back to when nobody has backed a
// selection yet, so the preview matches what the ticket will actually lock in
// (see DEFAULT_COMBO_ODD in apps/backend's bet.controller).
const DEFAULT_ODD = 2

// Mirrors MIN_ODD in packages/betting/core's ComboLeg: a selection holding the
// whole pool prices at 1.00 and the domain refuses it as a leg
// (INVALID_COMBO_ODD), so the panel has to rule it out up front.
const MIN_COMBO_ODD = 1.01

const isOutright = (selection: SlipSelection) => selection.marketType === 'tournament_outright'

const oddsUrl = (selection: SlipSelection) =>
  isOutright(selection)
    ? `/bet/tournament/${selection.marketId}/odds`
    : `/bet/match/${selection.marketId}/odds`

// Same cache keys the match page and the outright card already use, so the slip
// shares their data instead of opening a second query for the same odds.
const oddsKey = (selection: SlipSelection) =>
  isOutright(selection) ? ['outright-odds', selection.marketId] : ['odds', selection.marketId]

/**
 * Drives the bet slip panel. Holds the stakes and which mode is active, prices
 * every pick from the live odds, and turns "confirm" into the right call:
 *  - simples  -> one POST /bet per pick (parimutuel: the odd shown is only
 *    indicative, the real payout comes from the pool at settlement);
 *  - multiplas -> a single POST /bet/combo (fixed odds, locked on confirmation).
 */
export function useBetSlipPanel() {
  const queryClient = useQueryClient()
  const { selections, remove, clear } = useBetSlip()
  const { isSelfExcluded } = useSelfExclusion()

  const [mode, setMode] = useState<SlipMode>('simples')
  const [singleStakes, setSingleStakes] = useState<Record<string, string>>({})
  const [comboStake, setComboStake] = useState('')

  const oddsQueries = useQueries({
    queries: selections.map((selection) => ({
      queryKey: oddsKey(selection),
      queryFn: async (): Promise<MarketOddsDTO> => (await api.get<MarketOddsDTO>(oddsUrl(selection))).data,
    })),
  })

  // `priced` carries whether the odd is REAL (derived from a pool) or the neutral
  // fallback. The panel must not show a fallback as if it were a firm price — the
  // match page shows "—" for a selection nobody has backed, and the slip has to
  // agree with it.
  const priced = selections.map((selection, index) => {
    const entry = oddsQueries[index]?.data?.entries.find(
      (candidate) => candidate.selectionId === selection.selectionId,
    )
    return {
      ...selection,
      odd: entry?.impliedOdd || DEFAULT_ODD,
      hasPool: !!entry?.impliedOdd,
    }
  })

  const totalOdd = Math.round(priced.reduce((product, entry) => product * entry.odd, 1) * 100) / 100

  // Legs the domain would reject; Múltiplas stays unavailable while any is in.
  const notCombinable = priced.filter((entry) => entry.odd < MIN_COMBO_ODD)
  const canCombo = selections.length >= 2 && notCombinable.length === 0

  const singlesTotalCents = selections.reduce(
    (total, selection) => total + toCents(singleStakes[selection.marketId] ?? ''),
    0,
  )
  const comboStakeCents = toCents(comboStake)

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['wallet'] })
    queryClient.invalidateQueries({ queryKey: ['bets'] })
    queryClient.invalidateQueries({ queryKey: ['combo-mine'] })
    selections.forEach((selection) => {
      queryClient.invalidateQueries({ queryKey: oddsKey(selection) })
      queryClient.invalidateQueries({
        queryKey: isOutright(selection)
          ? ['outright-odds-history', selection.marketId]
          : ['odds-history', selection.marketId],
      })
      queryClient.invalidateQueries({ queryKey: ['book', selection.marketId] })
      queryClient.invalidateQueries({ queryKey: ['match', selection.marketId] })
    })
  }

  const placeSingles = useMutation({
    // Independent bets: one failing (say, a market that just locked) must not
    // hold back the others, so each is awaited on its own and they are reported
    // together at the end.
    //
    // ONE AT A TIME on purpose: every bet re-reads the wallet to place the hold,
    // so firing them in parallel makes two requests read the same balance and
    // the second write swallows the first hold.
    mutationFn: async () => {
      const pending = selections.filter(
        (selection) => toCents(singleStakes[selection.marketId] ?? '') > 0,
      )
      const results: PromiseSettledResult<string>[] = []
      for (const selection of pending) {
        try {
          await api.post('/bet', {
            marketType: selection.marketType,
            marketId: selection.marketId,
            selectionId: selection.selectionId,
            stake: toCents(singleStakes[selection.marketId] ?? ''),
          })
          results.push({ status: 'fulfilled', value: selection.marketId })
        } catch (failure) {
          results.push({ status: 'rejected', reason: failure })
        }
      }
      return results
    },
    onSuccess: (results) => {
      const placed = results.filter((result) => result.status === 'fulfilled')
      const failed = results.filter((result) => result.status === 'rejected')

      placed.forEach((result) => {
        if (result.status === 'fulfilled') remove(result.value)
      })
      setSingleStakes({})
      invalidate()

      if (placed.length) {
        notify.success(placed.length === 1 ? 'Aposta confirmada.' : `${placed.length} apostas confirmadas.`)
      }
      // The rejected ones stay in the slip so they can be fixed and retried.
      if (failed.length) notify.failure(failed[0].reason, 'Não foi possível confirmar parte das apostas.')
    },
    onError: (failure) => notify.failure(failure, 'Não foi possível apostar.'),
  })

  const placeCombo = useMutation({
    mutationFn: () =>
      api.post('/bet/combo', {
        stake: comboStakeCents,
        legs: selections.map(({ marketType, marketId, selectionId }) => ({
          marketType,
          marketId,
          selectionId,
        })),
      }),
    onSuccess: () => {
      clear()
      setComboStake('')
      invalidate()
      notify.success('Bilhete confirmado.')
    },
    onError: (failure) => notify.failure(failure, 'Não foi possível confirmar o bilhete.'),
  })

  const confirm = () => {
    if (isSelfExcluded) {
      notify.error('Sua autoexclusão está ativa — depósitos e apostas estão bloqueados.')
      return
    }
    if (mode === 'simples') {
      if (singlesTotalCents <= 0) {
        notify.error('Informe o valor de pelo menos uma aposta.')
        return
      }
      placeSingles.mutate()
      return
    }
    if (selections.length < 2) {
      notify.error('O bilhete precisa de pelo menos 2 seleções.')
      return
    }
    if (notCombinable.length) {
      notify.error(
        `"${notCombinable[0].selectionLabel}" está com odd ${notCombinable[0].odd}x e não pode entrar num bilhete múltiplo.`,
      )
      return
    }
    if (comboStakeCents <= 0) {
      notify.error('Informe o valor do bilhete.')
      return
    }
    placeCombo.mutate()
  }

  return {
    selections: priced,
    count: selections.length,
    mode,
    setMode,
    singleStakes,
    setSingleStake: (marketId: string, amount: string) =>
      setSingleStakes((current) => ({ ...current, [marketId]: amount })),
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
    placing: placeSingles.isPending || placeCombo.isPending,
    isSelfExcluded,
  }
}
