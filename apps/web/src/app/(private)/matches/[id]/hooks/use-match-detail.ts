'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import type { MatchDTO } from '@match/adapters'
import type { MatchOddsDTO, BetDTO } from '@betting/adapters'
import { api } from '@/lib/api'
import { errorMessage } from '@/lib/api/errors'
import { toCents } from '@/lib/money'
import { toDateTimeLocalValue } from '@/lib/date'
import { useAuth } from '@/contexts/auth-context'

interface BetFields {
  participantId: string
  amount: string // reais
}

interface EditFields {
  title: string
  gameType: string
  scheduledAt: string
}

export function useMatchDetail(matchId: string) {
  const queryClient = useQueryClient()
  const { isAdmin } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)

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

  // Edit (admin, only while open): title / gameType / scheduledAt.
  const editForm = useForm<EditFields>({ defaultValues: { title: '', gameType: '', scheduledAt: '' } })

  const startEdit = () => {
    if (!match.data) return
    editForm.reset({
      title: match.data.title,
      gameType: match.data.gameType ?? '',
      scheduledAt: toDateTimeLocalValue(match.data.scheduledAt),
    })
    setError(null)
    setIsEditing(true)
  }

  const update = useMutation({
    mutationFn: (fields: EditFields) =>
      api.patch(`/match/${matchId}`, {
        title: fields.title,
        gameType: fields.gameType.trim() || null,
        scheduledAt: new Date(fields.scheduledAt).toISOString(),
      }),
    onSuccess: () => {
      setIsEditing(false)
      invalidate()
    },
    onError: (failure) => setError(errorMessage(failure, 'Não foi possível salvar a partida.')),
  })

  const onEditSubmit = editForm.handleSubmit((fields) => {
    setError(null)
    update.mutate(fields)
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
    isEditing,
    startEdit,
    cancelEdit: () => setIsEditing(false),
    editForm,
    onEditSubmit,
    saving: update.isPending,
  }
}
