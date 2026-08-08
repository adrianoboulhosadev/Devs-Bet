'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import type { MatchDTO } from '@match/adapters'
import type { MarketOddsDTO, BetDTO, OddsSnapshotDTO } from '@betting/adapters'
import { api } from '@/lib/api'
import { notify } from '@/lib/notify'
import { toCents } from '@/lib/money'
import { toDateTimeLocalValue } from '@/lib/date'
import { useAuth } from '@/contexts/auth-context'
import { useCategories } from '@/hooks/use-categories'

// Betting selection id for "the match ends in a draw" (must match the sentinel
// in packages/match/core's Match model and the backend's bet.controller).
export const MATCH_DRAW_SELECTION_ID = 'draw'

interface BetFields {
  participantId: string
  amount: string // reais
}

interface EditFields {
  title: string
  categoryId: string
  scheduledAt: string
}

export function useMatchDetail(matchId: string) {
  const queryClient = useQueryClient()
  const { isAdmin } = useAuth()
  const { categories, pathOf } = useCategories()
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
    queryFn: async (): Promise<MarketOddsDTO> =>
      (await api.get<MarketOddsDTO>(`/bet/match/${matchId}/odds`)).data,
    // Odds float while the match is open; poll to reflect new bets.
    refetchInterval: isOpen ? 5000 : false,
  })

  const book = useQuery({
    queryKey: bookKey,
    queryFn: async (): Promise<BetDTO[]> => (await api.get<BetDTO[]>(`/bet/match/${matchId}`)).data,
  })

  const oddsHistoryKey = ['odds-history', matchId]
  const oddsHistory = useQuery({
    queryKey: oddsHistoryKey,
    queryFn: async (): Promise<OddsSnapshotDTO[]> =>
      (await api.get<OddsSnapshotDTO[]>(`/bet/match/${matchId}/odds/history`)).data,
    refetchInterval: isOpen ? 5000 : false,
  })

  // The live-odds endpoint only sees OPEN bets, so once the market settles it
  // reports an empty pool. The closing pool is the last odds snapshot (all rows
  // share the recordedAt of the bet that produced them) — see OddsSnapshotDTO.
  const closingOdds = ((): MarketOddsDTO | undefined => {
    const snapshots = oddsHistory.data
    if (!snapshots?.length) return undefined
    const lastRecordedAt = snapshots.reduce(
      (latest, snapshot) => Math.max(latest, new Date(snapshot.recordedAt).getTime()),
      0,
    )
    const closing = snapshots.filter(
      (snapshot) => new Date(snapshot.recordedAt).getTime() === lastRecordedAt,
    )
    return {
      marketId: matchId,
      totalPool: closing[0]?.totalPool ?? 0,
      entries: closing.map((snapshot) => ({
        selectionId: snapshot.selectionId,
        pool: snapshot.pool,
        bettors: 0,
        impliedOdd: snapshot.impliedOdd,
      })),
    }
  })()

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: matchKey })
    queryClient.invalidateQueries({ queryKey: oddsKey })
    queryClient.invalidateQueries({ queryKey: bookKey })
    queryClient.invalidateQueries({ queryKey: oddsHistoryKey })
    queryClient.invalidateQueries({ queryKey: ['wallet'] })
  }

  const betForm = useForm<BetFields>({ defaultValues: { participantId: '', amount: '' } })

  const placeBet = useMutation({
    mutationFn: (fields: BetFields) =>
      api.post('/bet', {
        marketType: 'match',
        marketId: matchId,
        selectionId: fields.participantId,
        stake: toCents(fields.amount),
      }),
    onSuccess: () => {
      betForm.reset()
      invalidate()
      notify.success('Aposta confirmada.')
    },
    onError: (failure) => notify.failure(failure, 'Não foi possível apostar.'),
  })

  const onPlaceBet = betForm.handleSubmit((fields) => placeBet.mutate(fields))

  const lock = useMutation({
    mutationFn: () => api.post(`/match/${matchId}/lock`),
    onSuccess: () => {
      invalidate()
      notify.success('Apostas travadas.')
    },
    onError: (failure) => notify.failure(failure, 'Não foi possível travar as apostas.'),
  })

  // Records the winner of the match's next unit (map/leg/round/fight). A bestOf-1
  // match settles right away; a bestOf-3/5 one may need this called again.
  const recordUnitResult = useMutation({
    mutationFn: (winnerParticipantId: string | null) =>
      api.post(`/match/${matchId}/units`, { winnerParticipantId }),
    onSuccess: () => {
      invalidate()
      notify.success('Resultado registrado.')
    },
    onError: (failure) => notify.failure(failure, 'Não foi possível registrar o resultado.'),
  })

  const cancel = useMutation({
    mutationFn: () => api.post(`/match/${matchId}/cancel`),
    onSuccess: () => {
      invalidate()
      notify.success('Partida cancelada — as apostas foram estornadas.')
    },
    onError: (failure) => notify.failure(failure, 'Não foi possível cancelar a partida.'),
  })

  // Edit (admin, only while open): title / gameType / scheduledAt.
  const editForm = useForm<EditFields>({ defaultValues: { title: '', categoryId: '', scheduledAt: '' } })

  const startEdit = () => {
    if (!match.data) return
    editForm.reset({
      title: match.data.title,
      categoryId: match.data.categoryId,
      scheduledAt: toDateTimeLocalValue(match.data.scheduledAt),
    })
    setIsEditing(true)
  }

  const update = useMutation({
    mutationFn: (fields: EditFields) =>
      api.patch(`/match/${matchId}`, {
        title: fields.title,
        categoryId: fields.categoryId,
        scheduledAt: new Date(fields.scheduledAt).toISOString(),
      }),
    onSuccess: () => {
      setIsEditing(false)
      invalidate()
      notify.success('Partida atualizada.')
    },
    onError: (failure) => notify.failure(failure, 'Não foi possível salvar a partida.'),
  })

  const onEditSubmit = editForm.handleSubmit((fields) => update.mutate(fields))

  return {
    match: match.data,
    odds: isOpen ? odds.data : (closingOdds ?? odds.data),
    marketClosed: !isOpen,
    oddsHistory: oddsHistory.data ?? [],
    book: book.data ?? [],
    loading: match.isLoading,
    isAdmin,
    isOpen,
    betForm,
    onPlaceBet,
    placing: placeBet.isPending,
    lock: () => lock.mutate(),
    recordUnitResult: (winnerParticipantId: string | null) => recordUnitResult.mutate(winnerParticipantId),
    cancel: () => cancel.mutate(),
    isEditing,
    startEdit,
    cancelEdit: () => setIsEditing(false),
    editForm,
    onEditSubmit,
    saving: update.isPending,
    categories,
    pathOf,
  }
}
