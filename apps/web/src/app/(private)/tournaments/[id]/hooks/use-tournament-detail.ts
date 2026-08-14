'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { TournamentDTO } from '@tournament/adapters'
import { api } from '@/lib/api'
import { notify } from '@/lib/notify'
import { useAuth } from '@/contexts/auth-context'
import { useCategories } from '@/hooks/use-categories'
import { qualifierCountOf, roundCountOf, roundLabelOf } from '@/lib/tournament-bracket'

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

  const cancel = useMutation({
    mutationFn: () => api.post(`/tournament/${tournamentId}/cancel`),
    onSuccess: () => {
      invalidate()
      notify.success('Torneio cancelado — as apostas foram estornadas.')
    },
    onError: (failure) => notify.failure(failure, 'Não foi possível cancelar o torneio.'),
  })

  const size = tournament.data?.size ?? 0
  const qualifierCount = qualifierCountOf(size)
  const roundCount = roundCountOf(size)
  const roundLabel = (round: number): string => roundLabelOf(round, roundCount)

  const championName =
    tournament.data?.participants.find(
      (participant) => participant.id === tournament.data?.championParticipantId,
    )?.displayName ?? null

  // Destructive action guard for the cancel button.
  const [confirmingCancel, setConfirmingCancel] = useState(false)

  return {
    confirmingCancel,
    setConfirmingCancel,
    tournament: tournament.data,
    loading: tournament.isLoading,
    isAdmin,
    pathOf,
    roundCount,
    roundLabel,
    championName,
    cancel: () => {
      cancel.mutate()
    },
  }
}
