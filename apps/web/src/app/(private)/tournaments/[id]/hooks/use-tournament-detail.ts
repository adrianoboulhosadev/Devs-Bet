'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { TournamentDTO } from '@tournament/adapters'
import { api } from '@/lib/api'
import { errorMessage } from '@/lib/api/errors'
import { useAuth } from '@/contexts/auth-context'
import { useCategories } from '@/hooks/use-categories'

// Round labels by distance to the final (a 32-bracket reaches "16-avos").
const ROUND_LABELS = ['Final', 'Semifinal', 'Quartas', 'Oitavas', '16-avos']

export function useTournamentDetail(tournamentId: string) {
  const queryClient = useQueryClient()
  const { isAdmin } = useAuth()
  const { pathOf } = useCategories()
  const [error, setError] = useState<string | null>(null)

  const tournamentKey = ['tournament', tournamentId]

  const tournament = useQuery({
    queryKey: tournamentKey,
    queryFn: async (): Promise<TournamentDTO> =>
      (await api.get<TournamentDTO>(`/tournament/${tournamentId}`)).data,
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: tournamentKey })
    // The bracket matches (and any bets/wallet) may have changed.
    queryClient.invalidateQueries({ queryKey: ['match'] })
    queryClient.invalidateQueries({ queryKey: ['wallet'] })
  }

  const declare = useMutation({
    mutationFn: ({ matchId, winnerParticipantId }: { matchId: string; winnerParticipantId: string }) =>
      api.post(`/tournament/${tournamentId}/matches/${matchId}/result`, { winnerParticipantId }),
    onSuccess: invalidate,
    onError: (failure) => setError(errorMessage(failure, 'Não foi possível declarar o vencedor.')),
  })

  const cancel = useMutation({
    mutationFn: () => api.post(`/tournament/${tournamentId}/cancel`),
    onSuccess: invalidate,
    onError: (failure) => setError(errorMessage(failure)),
  })

  const size = tournament.data?.size ?? 0
  const roundCount = size >= 2 ? Math.log2(size) : 0
  const roundLabel = (round: number): string =>
    ROUND_LABELS[roundCount - 1 - round] ?? `Rodada ${round + 1}`

  const championName =
    tournament.data?.participants.find(
      (participant) => participant.id === tournament.data?.championParticipantId,
    )?.displayName ?? null

  return {
    tournament: tournament.data,
    loading: tournament.isLoading,
    isAdmin,
    error,
    pathOf,
    roundCount,
    roundLabel,
    championName,
    declareResult: (matchId: string, winnerParticipantId: string) => {
      setError(null)
      declare.mutate({ matchId, winnerParticipantId })
    },
    declaring: declare.isPending,
    cancel: () => {
      setError(null)
      cancel.mutate()
    },
  }
}
