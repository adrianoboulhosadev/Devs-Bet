'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import type { MatchDTO } from '@match/adapters'
import type { MatchOddsDTO, BetDTO } from '@betting/adapters'
import { api } from '@/lib/api'
import { errorMessage } from '@/lib/api/errors'
import { toCents } from '@/lib/money'
import { useAuth } from '@/contexts/auth-context'

interface BetFields {
  participantId: string
  amount: string // reais
}

export function useMatchDetail(matchId: string) {
  const queryClient = useQueryClient()
  const { isAdmin } = useAuth()
  const [error, setError] = useState<string | null>(null)

  const matchKey = ['match', matchId]
  const oddsKey = ['odds', matchId]
  const bookKey = ['book', matchId]

  const match = useQuery({
    queryKey: matchKey,
    queryFn: async (): Promise<MatchDTO> => (await api.get<MatchDTO>(`/match/${matchId}`)).data,
  })

  const isOpen = match.data?.status === 'open'

  const odds = useQuery({
    queryKey: oddsKey,
    queryFn: async (): Promise<MatchOddsDTO> =>
      (await api.get<MatchOddsDTO>(`/bet/match/${matchId}/odds`)).data,
    // Odds float while the match is open; poll to reflect new bets.
    refetchInterval: isOpen ? 5000 : false,
  })

  const book = useQuery({
    queryKey: bookKey,
    queryFn: async (): Promise<BetDTO[]> => (await api.get<BetDTO[]>(`/bet/match/${matchId}`)).data,
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: matchKey })
    queryClient.invalidateQueries({ queryKey: oddsKey })
    queryClient.invalidateQueries({ queryKey: bookKey })
    queryClient.invalidateQueries({ queryKey: ['wallet'] })
  }

  const betForm = useForm<BetFields>({ defaultValues: { participantId: '', amount: '' } })

  const placeBet = useMutation({
    mutationFn: (fields: BetFields) =>
      api.post('/bet', { matchId, participantId: fields.participantId, stake: toCents(fields.amount) }),
    onSuccess: () => {
      betForm.reset()
      invalidate()
    },
    onError: (failure) => setError(errorMessage(failure, 'Não foi possível apostar.')),
  })

  const onPlaceBet = betForm.handleSubmit((fields) => {
    setError(null)
    placeBet.mutate(fields)
  })

  const lock = useMutation({
    mutationFn: () => api.post(`/match/${matchId}/lock`),
    onSuccess: invalidate,
    onError: (failure) => setError(errorMessage(failure)),
  })

  const settle = useMutation({
    mutationFn: (winnerParticipantId: string) =>
      api.post(`/match/${matchId}/settle`, { winnerParticipantId }),
    onSuccess: invalidate,
    onError: (failure) => setError(errorMessage(failure)),
  })

  const cancel = useMutation({
    mutationFn: () => api.post(`/match/${matchId}/cancel`),
    onSuccess: invalidate,
    onError: (failure) => setError(errorMessage(failure)),
  })

  return {
    match: match.data,
    odds: odds.data,
    book: book.data ?? [],
    loading: match.isLoading,
    isAdmin,
    isOpen,
    error,
    betForm,
    onPlaceBet,
    placing: placeBet.isPending,
    lock: () => lock.mutate(),
    settle: (winnerParticipantId: string) => settle.mutate(winnerParticipantId),
    cancel: () => cancel.mutate(),
  }
}
