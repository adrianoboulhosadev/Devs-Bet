'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import type { MatchDTO } from '@match/adapters'
import { MATCH_DRAW_SELECTION_ID } from '@match/adapters'
import type { TournamentDTO } from '@tournament/adapters'
import type { ComboBetDTO, ComboBetLegInput, BetMarketType, MarketOddsDTO } from '@betting/adapters'
import { api } from '@/lib/api'
import { errorMessage } from '@/lib/api/errors'
import { toCents } from '@/lib/money'

// Neutral "evens" price the backend falls back to when nobody has backed a
// selection yet (mirrors DEFAULT_COMBO_ODD in apps/backend's bet.controller) —
// used only to keep the client-side preview in the same ballpark.
const DEFAULT_COMBO_ODD = 2

interface PickableSelection {
  id: string
  label: string
}

interface PickableMarket {
  marketType: BetMarketType
  marketId: string
  label: string
  selections: PickableSelection[]
}

interface SelectedLeg extends ComboBetLegInput {
  marketLabel: string
  selectionLabel: string
}

interface StakeForm {
  amount: string // reais
}

export function useCombo() {
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [legs, setLegs] = useState<SelectedLeg[]>([])
  const [pickedMarketKey, setPickedMarketKey] = useState('')
  const [pickedSelectionId, setPickedSelectionId] = useState('')

  // Reuses the same query keys as the matches/tournaments lobby pages (full,
  // unfiltered lists) — both to build the leg picker (open ones only) and to
  // resolve labels for the ticket history below (any status).
  const matches = useQuery({
    queryKey: ['matches'],
    queryFn: async (): Promise<MatchDTO[]> => (await api.get<MatchDTO[]>('/match')).data,
  })
  const tournaments = useQuery({
    queryKey: ['tournaments'],
    queryFn: async (): Promise<TournamentDTO[]> => (await api.get<TournamentDTO[]>('/tournament')).data,
  })
  const myCombos = useQuery({
    queryKey: ['combo-mine'],
    queryFn: async (): Promise<ComboBetDTO[]> => (await api.get<ComboBetDTO[]>('/bet/combo/mine')).data,
  })

  const allMarkets = useMemo((): PickableMarket[] => {
    const fromMatches: PickableMarket[] = (matches.data ?? []).map((match) => ({
      marketType: 'match',
      marketId: match.id,
      label: match.title,
      selections: [
        ...match.participants.map((participant) => ({ id: participant.id, label: participant.displayName })),
        ...(match.allowsDraw ? [{ id: MATCH_DRAW_SELECTION_ID, label: 'Empate' }] : []),
      ],
    }))
    const fromTournaments: PickableMarket[] = (tournaments.data ?? []).map((tournament) => ({
      marketType: 'tournament_outright',
      marketId: tournament.id,
      label: `${tournament.title} (campeão)`,
      selections: tournament.participants.map((participant) => ({
        id: participant.id,
        label: participant.displayName,
      })),
    }))
    return [...fromMatches, ...fromTournaments]
  }, [matches.data, tournaments.data])

  // Only open matches / not-yet-started tournaments can receive a new leg — a
  // best-effort client-side mirror of the backend's resolveMarket check.
  const pickableMarkets = useMemo(
    () =>
      allMarkets.filter((market) => {
        if (market.marketType === 'tournament_outright') {
          const tournament = tournaments.data?.find((candidate) => candidate.id === market.marketId)
          return (
            tournament?.status === 'in_progress' &&
            new Date(tournament.scheduledAt).getTime() > Date.now()
          )
        }
        const match = matches.data?.find((candidate) => candidate.id === market.marketId)
        return match?.status === 'open'
      }),
    [allMarkets, matches.data, tournaments.data],
  )

  const marketLabel = (marketType: BetMarketType, marketId: string) =>
    allMarkets.find((market) => market.marketType === marketType && market.marketId === marketId)?.label ??
    '—'

  const selectionLabel = (marketType: BetMarketType, marketId: string, selectionId: string) =>
    allMarkets
      .find((market) => market.marketType === marketType && market.marketId === marketId)
      ?.selections.find((selection) => selection.id === selectionId)?.label ??
    (selectionId === MATCH_DRAW_SELECTION_ID ? 'Empate' : '—')

  const [pickedMarketType, pickedMarketId] = pickedMarketKey.split(':') as [BetMarketType, string]
  const pickedMarket = pickableMarkets.find(
    (market) => market.marketType === pickedMarketType && market.marketId === pickedMarketId,
  )

  const addLeg = () => {
    setError(null)
    if (!pickedMarket || !pickedSelectionId) return
    if (legs.some((leg) => leg.marketId === pickedMarket.marketId)) {
      setError('Você já tem uma seleção desta partida/torneio no bilhete.')
      return
    }
    const selection = pickedMarket.selections.find((candidate) => candidate.id === pickedSelectionId)!
    setLegs((current) => [
      ...current,
      {
        marketType: pickedMarket.marketType,
        marketId: pickedMarket.marketId,
        selectionId: pickedSelectionId,
        marketLabel: pickedMarket.label,
        selectionLabel: selection.label,
      },
    ])
    setPickedMarketKey('')
    setPickedSelectionId('')
  }

  const removeLeg = (marketId: string) => {
    setLegs((current) => current.filter((leg) => leg.marketId !== marketId))
  }

  // Live odds per leg — just an ESTIMATE for the ticket preview. The real,
  // fixed odd is only locked in when the bilhete is actually confirmed (the
  // backend re-reads the pool at that moment, same as the deposit QR flow
  // shows an estimate before the real Pix payload is generated).
  const legOdds = useQueries({
    queries: legs.map((leg) => ({
      queryKey: ['odds', leg.marketId],
      queryFn: async (): Promise<MarketOddsDTO> =>
        (
          await api.get<MarketOddsDTO>(
            leg.marketType === 'tournament_outright'
              ? `/bet/tournament/${leg.marketId}/odds`
              : `/bet/match/${leg.marketId}/odds`,
          )
        ).data,
    })),
  })

  const estimatedTotalOdd = legs.reduce((product, leg, index) => {
    const odds = legOdds[index]?.data
    const entry = odds?.entries.find((candidate) => candidate.selectionId === leg.selectionId)
    return product * (entry?.impliedOdd || DEFAULT_COMBO_ODD)
  }, 1)

  const stakeForm = useForm<StakeForm>({ defaultValues: { amount: '' } })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['combo-mine'] })
    queryClient.invalidateQueries({ queryKey: ['wallet'] })
  }

  const placeCombo = useMutation({
    mutationFn: (fields: StakeForm) =>
      api.post('/bet/combo', {
        stake: toCents(fields.amount),
        legs: legs.map(({ marketType, marketId, selectionId }) => ({ marketType, marketId, selectionId })),
      }),
    onSuccess: () => {
      setLegs([])
      stakeForm.reset()
      invalidate()
    },
    onError: (failure) => setError(errorMessage(failure, 'Não foi possível confirmar o bilhete.')),
  })

  const onSubmit = stakeForm.handleSubmit((fields) => {
    setError(null)
    if (legs.length < 2) {
      setError('Adicione pelo menos 2 seleções ao bilhete.')
      return
    }
    placeCombo.mutate(fields)
  })

  return {
    loading: matches.isLoading || tournaments.isLoading,
    error,
    pickableMarkets,
    pickedMarketKey,
    setPickedMarketKey: (key: string) => {
      setPickedMarketKey(key)
      setPickedSelectionId('')
    },
    pickedMarket,
    pickedSelectionId,
    setPickedSelectionId,
    addLeg,
    legs,
    removeLeg,
    estimatedTotalOdd: legs.length >= 2 ? Math.round(estimatedTotalOdd * 100) / 100 : null,
    stakeForm,
    onSubmit,
    placing: placeCombo.isPending,
    myCombos: myCombos.data ?? [],
    combosLoading: myCombos.isLoading,
    marketLabel,
    selectionLabel,
  }
}
