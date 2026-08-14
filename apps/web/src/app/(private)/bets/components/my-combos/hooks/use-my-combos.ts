'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ComboBetDTO, BetMarketType } from '@betting/adapters'
import type { MatchDTO } from '@match/adapters'
import type { TournamentDTO } from '@tournament/adapters'
import { api } from '@/lib/api'
import { notify } from '@/lib/notify'
import { MATCH_DRAW_SELECTION_ID } from '@/data/match-selections'

/**
 * The user's combo tickets, plus the lookups needed to name each leg: the DTO
 * carries only ids, so the match/tournament lists translate them into the
 * titles and selection names actually shown.
 */
export function useMyCombos() {
  const queryClient = useQueryClient()

  const combos = useQuery({
    queryKey: ['combo-mine'],
    queryFn: async (): Promise<ComboBetDTO[]> => (await api.get<ComboBetDTO[]>('/bet/combo/mine')).data,
  })

  const matches = useQuery({
    queryKey: ['matches'],
    queryFn: async (): Promise<MatchDTO[]> => (await api.get<MatchDTO[]>('/match')).data,
  })

  const tournaments = useQuery({
    queryKey: ['tournaments'],
    queryFn: async (): Promise<TournamentDTO[]> => (await api.get<TournamentDTO[]>('/tournament')).data,
  })

  const marketLabel = (marketType: BetMarketType, marketId: string): string => {
    if (marketType === 'tournament_outright') {
      const tournament = tournaments.data?.find((entry) => entry.id === marketId)
      return tournament ? `${tournament.title} (campeão)` : '—'
    }
    return matches.data?.find((entry) => entry.id === marketId)?.title ?? '—'
  }

  const selectionLabel = (marketType: BetMarketType, marketId: string, selectionId: string): string => {
    if (selectionId === MATCH_DRAW_SELECTION_ID) return 'Empate'
    if (marketType === 'tournament_outright') {
      return (
        tournaments.data
          ?.find((entry) => entry.id === marketId)
          ?.participants.find((participant) => participant.id === selectionId)?.displayName ?? '—'
      )
    }
    return (
      matches.data
        ?.find((entry) => entry.id === marketId)
        ?.participants.find((participant) => participant.id === selectionId)?.displayName ?? '—'
    )
  }

  /**
   * A ticket can only be pulled while EVERY market it touches still takes bets —
   * the same rule the backend enforces, mirrored here so the button is not
   * offered when it is bound to fail.
   */
  const canCancel = (combo: ComboBetDTO): boolean => {
    if (combo.status !== 'open') return false
    return combo.legs.every((leg) => {
      if (leg.marketType === 'tournament_outright') {
        const tournament = tournaments.data?.find((entry) => entry.id === leg.marketId)
        return (
          !!tournament &&
          tournament.status === 'in_progress' &&
          new Date(tournament.scheduledAt).getTime() > Date.now()
        )
      }
      return matches.data?.find((entry) => entry.id === leg.marketId)?.status === 'open'
    })
  }

  const cancel = useMutation({
    mutationFn: (comboBetId: string) => api.post(`/bet/combo/${comboBetId}/cancel`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['combo-mine'] })
      queryClient.invalidateQueries({ queryKey: ['wallet'] })
      notify.success('Aposta múltipla cancelada — o valor voltou para a carteira.')
    },
    onError: (failure) => notify.failure(failure, 'Não foi possível cancelar a aposta múltipla.'),
  })

  return {
    combos: combos.data ?? [],
    loading: combos.isLoading,
    marketLabel,
    selectionLabel,
    canCancel,
    cancelCombo: (comboBetId: string) => cancel.mutate(comboBetId),
    cancelling: cancel.isPending,
  }
}
