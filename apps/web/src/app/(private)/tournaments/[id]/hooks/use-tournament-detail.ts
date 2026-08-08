'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { TournamentDTO } from '@tournament/adapters'
import { api } from '@/lib/api'
import { notify } from '@/lib/notify'
import { useAuth } from '@/contexts/auth-context'
import { useCategories } from '@/hooks/use-categories'

// Round labels by distance to the final (a 32-entrant bracket reaches
// "16-avos"; a 64-entrant one, from a 128-size tournament's group stage,
// reaches "32-avos").
const ROUND_LABELS = ['Final', 'Semifinal', 'Quartas', 'Oitavas', '16-avos', '32-avos']
const GROUP_STAGE_THRESHOLD = 32

export function useTournamentDetail(tournamentId: string) {
  const queryClient = useQueryClient()
  const { isAdmin } = useAuth()
  const { pathOf } = useCategories()

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
    onSuccess: () => {
      invalidate()
      notify.success('Resultado registrado.')
    },
    onError: (failure) => notify.failure(failure, 'Não foi possível declarar o vencedor.'),
  })

  const cancel = useMutation({
    mutationFn: () => api.post(`/tournament/${tournamentId}/cancel`),
    onSuccess: () => {
      invalidate()
      notify.success('Torneio cancelado — as apostas foram estornadas.')
    },
    onError: (failure) => notify.failure(failure, 'Não foi possível cancelar o torneio.'),
  })

  const size = tournament.data?.size ?? 0
  // The bracket's actual entrant count: everyone below the group-stage
  // threshold, or each group's top two above it.
  const qualifierCount = size > GROUP_STAGE_THRESHOLD ? size / 2 : size
  const roundCount = qualifierCount >= 2 ? Math.log2(qualifierCount) : 0
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
    pathOf,
    roundCount,
    roundLabel,
    championName,
    declareResult: (matchId: string, winnerParticipantId: string) => {
      declare.mutate({ matchId, winnerParticipantId })
    },
    declaring: declare.isPending,
    cancel: () => {
      cancel.mutate()
    },
  }
}
